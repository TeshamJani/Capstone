
const mongoose = require('mongoose');

// Database connection details
const username = encodeURIComponent('myAdmin');
const password = encodeURIComponent('myAdminPassword');
const dbName = 'hstFunding'; // Name of the database

// Connecting to MongoDB
mongoose.connect(`mongodb://127.0.0.1:27017/${dbName}`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  authSource: 'admin', // Using the admin database for authentication
  user: username,
  pass: password,
}).then(() => console.log("Database Connected Successfully"))
  .catch(err => console.error("Database connection error:", err));

// User Schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  }
});

// Business Loan Application Schema
const BusinessLoanApplicationSchema = new mongoose.Schema({
  userId: { // Link to the User who submitted the application
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
  }
});

// Loan Offer Schema
const LoanOfferSchema = new mongoose.Schema({
  applicationId: { // Link to the Business Loan Application
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessLoanApplication',
    required: true
  },
  offerAmount: {
    type: Number,
    required: true
  },
  interestRate: {
    type: Number,
    required: true
  },
  termMonths: {
    type: Number,
    required: true
  }
});

// Compiling models from schemas
const User = mongoose.model("User", UserSchema);
const BusinessLoanApplication = mongoose.model("BusinessLoanApplication", BusinessLoanApplicationSchema);
const LoanOffer = mongoose.model("LoanOffer", LoanOfferSchema);

// Exporting models
module.exports = { User, BusinessLoanApplication, LoanOffer };
