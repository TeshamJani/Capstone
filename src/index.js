const express = require("express");
const session = require('express-session');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const nodemailer = require('nodemailer');
const { User, BusinessLoanApplication, LoanOffer, LoanStatus, AdminApproval, LoanSummary} = require("./config");

const app = express();

app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.set("view engine", "ejs");

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'projecthst5@5?gmail.com',
        pass: 'P@rojecthst'
    }
});

app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

app.get("/", (req, res) => {
    res.render("home", { user: req.session.user });
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/login", (req, res) => {
    if (req.session.user) {
        res.redirect("/");
    } else {
        res.render("login");
    }
});

app.get("/about", (req, res) => {
    res.render("about", { user: req.session.user || null });
});

app.get("/contact", (req, res) => {
    res.render("contactus", { user: req.session.user || null });
});

app.get('/apply', async (req, res) => {
    if (req.session.user) {
        let loanOfferData = null;
        if (req.session.loanOfferId) {
            loanOfferData = await LoanOffer.findById(req.session.loanOfferId);
            console.log(loanOfferData);
        }

        res.render('loan-application-form', {
            user: req.session.user,
            loanOffer: loanOfferData,
            messages: {
                success: req.flash('successMessage'),
                error: req.flash('errorMessage')
            }
        });
    } else {
        res.redirect('/login?from=apply');
    }
});

app.post('/send-loan-offer', async (req, res) => {
    const { email, offerId } = req.body;

    try {
        const loanOffer = await LoanOffer.findById(offerId);
        const doc = new PDFDocument();
        const filePath = `./tmp/loanOffer-${offerId}.pdf`;
        
        doc.pipe(fs.createWriteStream(filePath));
        doc.fontSize(25).text('Loan Offer', 100, 100);
        doc.end();

        doc.on('finish', function () {
            transporter.sendMail({
                from: 'yourgmail@gmail.com',
                to: email,
                subject: 'Your Loan Offer',
                text: 'Here is your personalized loan offer.',
                attachments: [
                    {
                        filename: 'loanOffer.pdf',
                        path: filePath
                    }
                ]
            }, (err, info) => {
                if (err) {
                    console.error('Error sending email:', err);
                    res.status(500).json({ message: 'Error sending email' });
                } else {
                    console.log('Email sent:', info.response);
                    res.json({ message: 'Email sent successfully' });
                }
            });
        });
    } catch (error) {
        console.error('Failed to send offer:', error);
        res.status(500).json({ message: 'Failed to send the offer' });
    }
});
const getAllLoanApplications = async () => {
    try {
      const applications = await BusinessLoanApplication.find().populate('status');
      return applications;
    } catch (error) {
      console.error("Error retrieving loan applications:", error);
      throw error;
    }
  };
  app.get("/admin-dashboard", async (req, res) => {
    try {
        if (req.session.user && req.session.user.isAdmin) {
            const applications = await BusinessLoanApplication.find()
                .populate({
                    path: 'status',
                    populate: { path: 'updatedBy' } 
                })
                .populate('adminApproval'); 

            res.render("admin-dashboard", { applications });
        } else {
            res.status(403).send("Access denied");
        }
    } catch (error) {
        console.error("Error fetching applications:", error);
        res.status(500).send("Error fetching applications");
    }
});
app.get("/user-dashboard", async (req, res) => {
    if (!req.session.user) {
        res.redirect('/login');
    } else {
        try {
            const applications = await BusinessLoanApplication.find({ userId: req.session.user._id }).populate('status');
            res.render("user-dashboard", { applications, user: req.session.user });
        } catch (error) {
            console.error("Error fetching applications:", error);
            res.status(500).send("Error fetching applications");
        }
    }
});


app.post("/approve-loan", async (req, res) => {
    try {
        if (!req.session.user || !req.session.user.isAdmin) {
            return res.status(403).send("Access Denied");
        }

        const { applicationId } = req.body;

        const loanApplication = await BusinessLoanApplication.findById(applicationId);

        if (!loanApplication) {
            return res.status(404).send("Loan application not found");
        }

        const newStatus = await LoanStatus.create({
            applicationId: loanApplication._id,
            status: 'approved',
            updatedBy: req.session.user._id
        });

        const approvalData = {
            applicationId: loanApplication._id,
            approvalDate: Date.now(),
            loanPeriod: 12 
        };
        await AdminApproval.create(approvalData);

        loanApplication.status = newStatus._id;
        await loanApplication.save();

        res.redirect("/admin-dashboard");
    } catch (error) {
        console.error('Error approving loan application:', error);
        res.status(500).send('Error updating status');
    }
});


  

app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ name: username });
        if (existingUser) {
            req.flash('errorMessage', 'User already exists. Please choose a different username.');
            return res.redirect('/signup');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ name: username, password: hashedPassword });
        req.flash('successMessage', 'Successfully signed up! Please log in.');
        res.redirect("/login");
    } catch (error) {
        console.error("Signup error:", error);
        req.flash('errorMessage', 'An error occurred during the registration process.');
        res.redirect("/signup");
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (username === "admin" && password === "adminpassword") {
        req.session.user = { username: "admin", isAdmin: true };
        return res.redirect("/admin-dashboard");
    } else {
        try {
            const user = await User.findOne({ name: username });
            if (user && await bcrypt.compare(password, user.password)) {
                req.session.user = { _id: user._id, name: user.name, isAdmin: false };
                return res.redirect("/");
            } else {
                req.flash('errorMessage', 'Invalid username or password.');
                res.redirect("/login");
            }
        } catch (error) {
            console.error("Login error:", error);
            req.flash('errorMessage', 'An error occurred during the login process.');
            res.redirect("/login");
        }
    }
});

app.post("/reject-loan", async (req, res) => {
    if (!req.session.user || !req.session.user.isAdmin) {
        return res.status(403).send("Access Denied");
    }

    const { applicationId } = req.body;

    try {
        let existingStatus = await LoanStatus.findOne({ applicationId });

        if (existingStatus) {
            existingStatus.status = 'rejected';
            existingStatus.updatedBy = req.session.user._id; 
            await existingStatus.save();
        } else {
            await LoanStatus.create({
                applicationId,
                status: 'rejected',
                updatedBy: req.session.user._id 
            });
        }
        res.redirect("/admin-dashboard");
    } catch (error) {
        console.error('Error updating application status:', error);
        res.status(500).send('Internal Server Error');
    }
});



app.post("/submit-application", async (req, res) => {
    if (!req.session.user) {
        req.flash('errorMessage', 'You need to log in to submit an application.');
        return res.redirect("/login?from=apply");
    }

    try {
        const { companyName, fundingAmount, monthlyRevenue, timeInBusiness, industry, additionalDetails, agreeTerms } = req.body;
        const applicationData = {
            companyName,
            fundingAmount,
            monthlyRevenue,
            timeInBusiness,
            industry,
            additionalDetails,
            userId: req.session.user._id,
            agreeTerms: agreeTerms === "on"
        };
        const savedApplication = await new BusinessLoanApplication(applicationData).save();
        const loanOffer = await generateLoanOffer(savedApplication);
        req.session.loanOfferId = loanOffer._id.toString();
        req.flash('loanOfferDetails', `Offer Generated: $${loanOffer.amount} at ${loanOffer.interestRate}%`);
        res.redirect('/apply');
    } catch (error) {
        console.error("Error submitting application:", error);
        req.flash('errorMessage', 'Failed to submit application. Please try again.');
        res.redirect('/apply');
    }
});
app.get("/application-status", async (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    try {
        let application = await BusinessLoanApplication.findOne({ userId: req.session.user._id })
                                .populate('status');
        
        res.render("application-status", { application });
    } catch (error) {
        console.error('Error fetching application status:', error);
        res.status(500).send('Internal Server Error');
    }
});

async function generateLoanOffer(application) {
    const revenueMultiplier = 0.2; 
    const baseRate = 10; 

    const monthlyRevenue = parseFloat(application.monthlyRevenue) || 0;
    const timeInBusiness = parseFloat(application.timeInBusiness) || 0;
    const requestedAmount = parseFloat(application.fundingAmount) || 0;

    console.log("monthlyRevenue:", monthlyRevenue);
    console.log("timeInBusiness:", timeInBusiness);
    console.log("requestedAmount:", requestedAmount);

    const maximumLoanAmount = monthlyRevenue * revenueMultiplier;
    const loanAmount = Math.min(requestedAmount, maximumLoanAmount);

    const options = [
        {
            interestRate: calculateInterestRate(timeInBusiness, 12),
            duration: '12 months',
            summary: 'Faster payoff with slightly higher interest rate.'
        },
        {
            interestRate: calculateInterestRate(timeInBusiness, 24),
            duration: '24 months',
            summary: 'Lower monthly payments with a longer term.'
        }
    ];

    const loanOffer = await new LoanOffer({
        applicationId: application._id,
        amount: loanAmount,
        options: options
    }).save();

    return loanOffer;
}

function calculateInterestRate(timeInBusiness, durationMonths) {
    const baseRate = 10;
    const businessDurationMultiplier = 0.1;
    let interestRate = baseRate - (timeInBusiness * businessDurationMultiplier);
    interestRate += durationMonths === 24 ? -0.5 : 0;
    return Math.max(interestRate, baseRate / 2);
}
async function updateLoanSummary(applicationId) {
    try {
      const application = await BusinessLoanApplication.findById(applicationId)
        .populate('status')
        .populate('adminApproval');
  
      let summary = await LoanSummary.findOne({ applicationId: application._id });
  
      if (!summary) {
        summary = new LoanSummary({
          applicationId: application._id,
          companyName: application.companyName,
          fundingAmount: application.fundingAmount,
          status: application.status.status,  
          approvalDate: application.adminApproval ? application.adminApproval.approvalDate : null,
          loanPeriod: application.adminApproval ? application.adminApproval.loanPeriod : null
        });
      } else {
        summary.status = application.status.status;
        summary.approvalDate = application.adminApproval ? application.adminApproval.approvalDate : null;
        summary.loanPeriod = application.adminApproval ? application.adminApproval.loanPeriod : null;
      }
  
      await summary.save();
    } catch (error) {
      console.error("Failed to update Loan Summary:", error);
    }
  }
  

app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

const PORT = process.env.PORT || 5011;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
