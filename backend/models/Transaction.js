const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  lender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  borrower: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['sale', 'borrow']
  },
  amount: {
    type: Number,
    required: function() {
      return this.transactionType === 'sale';
    }
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expectedReturnDate: {
    type: Date,
    required: function() {
      return this.transactionType === 'borrow';
    }
  },
  actualReturnDate: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['active', 'returned', 'completed', 'disputed'],
    default: 'active'
  },
  lenderConfirmation: {
    type: Boolean,
    default: false
  },
  borrowerConfirmation: {
    type: Boolean,
    default: false
  },
  rewardPointsEarned: {
    lender: {
      type: Number,
      default: 0
    },
    borrower: {
      type: Number,
      default: 0
    }
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

transactionSchema.index({ lender: 1, borrower: 1, status: 1 });
transactionSchema.index({ item: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);