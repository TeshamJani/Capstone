const mongoose = require('mongoose');

const username = 'myAdmin';
const password = 'myAdminPassword';
const dbName = 'hstFunding'; 
const host = '127.0.0.1:27017';

mongoose.connect(`mongodb://${host}/${dbName}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: 'admin',
  user: encodeURIComponent(username),
  pass: encodeURIComponent(password),
}).then(() => console.log("Database Connected Successfully"))
  .catch(err => console.error("Database connection error:", err));

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  }
});

const LoanSummarySchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessLoanApplication',
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  fundingAmount: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvalDate: {
    type: Date
  },
  loanPeriod: {
    type: Number
  }
});
const LoanOfferSchema = new mongoose.Schema({
  applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusinessLoanApplication', required: true },
  amount: { type: Number, required: true },
  options: [{
    interestRate: { type: Number, required: true },
    duration: { type: String, required: true },
    summary: { type: String, required: true } 
  }]
});

const LoanStatusSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessLoanApplication',
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
});



const BusinessLoanApplicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  fundingAmount: {
    type: String,
    required: true
  },
  monthlyRevenue: {
    type: String,
    required: true
  },
  timeInBusiness: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  industry: {
    type: String
  },
  additionalDetails: {
    type: String
  },
  agreeTerms: {
    type: Boolean,
    required: true
  },
  selectedOption: String, 
  status: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LoanStatus',
    default: null
  },
  adminApproval: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminApproval',
    default: null
  } 
});


const AdminApprovalSchema = new mongoose.Schema({
  applicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessLoanApplication',
    required: true,
  },
  approvalDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  loanPeriod: {
    type: Number,
    required: true
  }
});

// Model definitions
const User = mongoose.model("User", UserSchema);
const BusinessLoanApplication = mongoose.model("BusinessLoanApplication", BusinessLoanApplicationSchema);
const LoanOffer = mongoose.model("LoanOffer", LoanOfferSchema);
const LoanStatus = mongoose.model("LoanStatus", LoanStatusSchema);
const AdminApproval = mongoose.model("AdminApproval", AdminApprovalSchema);
const LoanSummary = mongoose.model("LoanSummary", LoanSummarySchema);


// Exporting models
module.exports = { User, BusinessLoanApplication, LoanOffer, LoanStatus, AdminApproval, };
