const express = require("express");
const session = require('express-session');
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
const app = express();
const { User, BusinessLoanApplication, LoanOffer} = require("./config"); // Corrected import

app.use(express.json());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));
app.use(flash());
app.set("view engine", "ejs");

// Configure session middleware
app.use(session({
  secret: 'secret', // Use a real secret in production
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Set to true if using https
}));

app.get("/", (req, res) => {
    res.render("home", { user: req.session.user });
});

app.get("/signup", (req, res) => {
    res.render("signup");
});

app.get("/login", (req, res) => {
    if (req.session.user) {
        res.redirect(req.query.from === 'apply' ? "/apply" : "/");
    } else {
        res.render("login");
    }
});

app.get('/apply', (req, res) => {
    if (req.session.user) {
        // Include a default value for loanOffers when rendering the form initially
        res.render('loan-application-form', { 
            user: req.session.user, 
            loanOffers: [], // Default to an empty array if not already set
            successMessage: req.flash('successMessage'), // Assuming you're using req.flash() for messaging
            errorMessage: req.flash('errorMessage')
        });
    } else {
        res.redirect('/login?from=apply');
    }
});

app.post('/submit-application', async (req, res) => {
    // Your existing logic to handle form submission
    
    // When rendering after form submission, ensure loanOffers is either
    // a populated array of offers or an empty array
    res.render('loan-application-form', {
        user: req.session.user,
        loanOffers: generatedLoanOffers || [], // Use your logic to set generatedLoanOffers
        successMessage: 'Application submitted successfully!', // Or set this via req.flash() as needed
        errorMessage: '' // Handle as needed, or use req.flash()
    });
});


app.post("/signup", async (req, res) => {
    const { username, password } = req.body;
    try {
        const existingUser = await User.findOne({ name: username });
        if (existingUser) {
            return res.status(409).send('User already exists. Please choose a different username.');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({ name: username, password: hashedPassword });
        req.session.user = newUser;
        res.redirect("/apply");
    } catch (error) {
        res.status(500).send("An error occurred during the registration process.");
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ name: username });
        if (!user) {
            return res.status(401).send("Username not found.");
        }
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(401).send("Incorrect password.");
        }
        req.session.user = user;
        res.redirect(req.query.from === 'apply' ? "/apply" : "/");
    } catch (error) {
        res.status(500).send("An error occurred during the login process.");
    }
});


app.post("/submit-application", async (req, res) => {
    if (!req.session.user) return res.redirect("/login?from=apply");

    try {
        const agreeTerms = req.body.agreeTerms === "on";
        const applicationData = { ...req.body, userId: req.session.user._id, agreeTerms };

        const savedApplication = await new BusinessLoanApplication(applicationData).save();

        // Simulate generating loan offers based on the application
        const loanOffersData = [
            { applicationId: savedApplication._id, offerAmount: 10000, interestRate: 5, termMonths: 12 },
            { applicationId: savedApplication._id, offerAmount: 20000, interestRate: 4.5, termMonths: 24 }
        ];

        const loanOffers = await LoanOffer.insertMany(loanOffersData);

        res.render('loan-application-form', {
            user: req.session.user,
            loanOffers: generatedLoanOffers || [], // Use your logic to set generatedLoanOffers
            successMessage: 'Application submitted successfully!', // Or set this via req.flash() as needed
            errorMessage: '' // Handle as needed, or use req.flash()
        });
    } catch (error) {
        console.error("Error submitting application:", error);
        res.render("loan-application-form", {
            user: req.session.user,
            errorMessage: "Failed to submit application. Please try again."
        });
    }
});




app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    }); 
});

const port = process.env.PORT || 5008;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
