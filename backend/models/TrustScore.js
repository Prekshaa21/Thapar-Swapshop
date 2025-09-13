const mongoose = require('mongoose');

const trustScoreSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  currentScore: {
    type: Number,
    default: 650,
    min: 300,
    max: 900
  },
  starRating: {
    type: Number,
    default: 3,
    min: 1,
    max: 5
  },
  transactions: [{
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction'
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request'
    },
    type: {
      type: String,
      enum: [
        'lender_ontime_return',
        'borrower_ontime_return',
        'borrower_early_return',
        'fulfilled_request',
        'first_transaction',
        'late_return',
        'non_return_dispute',
        'lender_unfair_cancel',
        'admin_penalty',
        'manual_adjustment'
      ],
      required: true
    },
    impact: {
      type: Number,
      required: true
    },
    description: {
      type: String,
      maxlength: 200
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    adminNotes: {
      type: String,
      maxlength: 500
    }
  }],
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  isFirstTransaction: {
    type: Boolean,
    default: true
  },
  monthsInactive: {
    type: Number,
    default: 0
  },
  totalTransactions: {
    type: Number,
    default: 0
  },
  positiveTransactions: {
    type: Number,
    default: 0
  },
  negativeTransactions: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
trustScoreSchema.index({ user: 1 });
trustScoreSchema.index({ currentScore: -1 });
trustScoreSchema.index({ 'transactions.createdAt': -1 });

// Virtual for trust level description
trustScoreSchema.virtual('trustLevel').get(function() {
  if (this.currentScore >= 820) return 'Excellent';
  if (this.currentScore >= 720) return 'Good';
  if (this.currentScore >= 600) return 'Fair';
  if (this.currentScore >= 450) return 'Risky';
  return 'Very Poor';
});

// Method to calculate star rating from score
trustScoreSchema.methods.calculateStarRating = function() {
  if (this.currentScore >= 820) return 5;
  if (this.currentScore >= 720) return 4;
  if (this.currentScore >= 600) return 3;
  if (this.currentScore >= 450) return 2;
  return 1;
};

// Method to get recent transactions (last 3)
trustScoreSchema.methods.getRecentTransactions = function() {
  return this.transactions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
};

// Method to get older transactions (beyond last 3)
trustScoreSchema.methods.getOlderTransactions = function() {
  return this.transactions
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(3);
};

// Static method to get impact values
trustScoreSchema.statics.getImpactValue = function(type) {
  const impactMap = {
    'lender_ontime_return': 80,
    'borrower_ontime_return': 40,
    'borrower_early_return': 60, // 40 base + 20 bonus
    'fulfilled_request': 60,
    'first_transaction': 30,
    'late_return': -50,
    'non_return_dispute': -100,
    'lender_unfair_cancel': -40,
    'admin_penalty': -70,
    'manual_adjustment': 0 // Admin sets custom value
  };
  return impactMap[type] || 0;
};

// Method to add transaction and recalculate score
trustScoreSchema.methods.addTransaction = function(transactionData) {
  const { type, transactionId, requestId, description, adminNotes, customImpact } = transactionData;
  
  // Get impact value
  let impact = customImpact !== undefined ? customImpact : this.constructor.getImpactValue(type);
  
  // Add first transaction bonus
  if (this.isFirstTransaction && impact > 0) {
    impact += this.constructor.getImpactValue('first_transaction');
    this.isFirstTransaction = false;
  }
  
  // Add transaction record
  const transaction = {
    type,
    impact,
    description,
    adminNotes,
    createdAt: new Date()
  };
  
  if (transactionId) transaction.transactionId = transactionId;
  if (requestId) transaction.requestId = requestId;
  
  this.transactions.push(transaction);
  
  // Update counters
  this.totalTransactions += 1;
  if (impact > 0) {
    this.positiveTransactions += 1;
  } else if (impact < 0) {
    this.negativeTransactions += 1;
  }
  
  // Update activity
  this.lastActivityAt = new Date();
  this.monthsInactive = 0;
  
  // Recalculate score
  this.recalculateScore();
  
  return this;
};

// Method to recalculate trust score using the formula
trustScoreSchema.methods.recalculateScore = function() {
  const BASE_SCORE = 650;
  const NORMALIZATION_FACTOR = 5;
  
  // Get recent (last 3) and older transactions
  const recentTransactions = this.getRecentTransactions();
  const olderTransactions = this.getOlderTransactions();
  
  // Calculate weighted impact
  let totalWeightedImpact = 0;
  
  // Recent transactions: weight = 2
  recentTransactions.forEach(transaction => {
    totalWeightedImpact += transaction.impact * 2;
  });
  
  // Older transactions: weight = 1
  olderTransactions.forEach(transaction => {
    totalWeightedImpact += transaction.impact * 1;
  });
  
  // Apply formula: BaseScore + (WeightedImpact / NormalizationFactor)
  let newScore = BASE_SCORE + (totalWeightedImpact / NORMALIZATION_FACTOR);
  
  // Apply inactivity penalty if applicable
  if (this.monthsInactive >= 12) {
    newScore -= 20;
  }
  
  // Ensure score stays within bounds
  this.currentScore = Math.max(300, Math.min(900, Math.round(newScore)));
  
  // Update star rating
  this.starRating = this.calculateStarRating();
  
  return this.currentScore;
};

// Method to apply inactivity penalty
trustScoreSchema.methods.applyInactivityPenalty = function() {
  const monthsSinceLastActivity = Math.floor((Date.now() - this.lastActivityAt) / (1000 * 60 * 60 * 24 * 30));
  
  if (monthsSinceLastActivity >= 12 && this.monthsInactive < 12) {
    this.monthsInactive = monthsSinceLastActivity;
    this.recalculateScore();
    return true;
  }
  
  return false;
};

// Static method to initialize trust score for new user
trustScoreSchema.statics.initializeForUser = async function(userId) {
  try {
    const existingScore = await this.findOne({ user: userId });
    if (existingScore) {
      return existingScore;
    }
    
    const newTrustScore = new this({
      user: userId,
      currentScore: 650,
      starRating: 3,
      transactions: [],
      lastActivityAt: new Date(),
      isFirstTransaction: true
    });
    
    await newTrustScore.save();
    return newTrustScore;
  } catch (error) {
    throw new Error(`Failed to initialize trust score: ${error.message}`);
  }
};

// Pre-save middleware to ensure consistency
trustScoreSchema.pre('save', function(next) {
  // Always recalculate star rating before saving
  this.starRating = this.calculateStarRating();
  next();
});

// Method to get trust score summary
trustScoreSchema.methods.getSummary = function() {
  return {
    userId: this.user,
    currentScore: this.currentScore,
    starRating: this.starRating,
    trustLevel: this.trustLevel,
    totalTransactions: this.totalTransactions,
    positiveTransactions: this.positiveTransactions,
    negativeTransactions: this.negativeTransactions,
    lastActivityAt: this.lastActivityAt,
    monthsInactive: this.monthsInactive,
    isFirstTransaction: this.isFirstTransaction,
    recentTransactions: this.getRecentTransactions().slice(0, 5) // Last 5 for summary
  };
};

module.exports = mongoose.model('TrustScore', trustScoreSchema);