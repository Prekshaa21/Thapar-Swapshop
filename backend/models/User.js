const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  hostel: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']
  },
  roomNo: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  rewardPoints: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  // Trust Score fields (denormalized for quick access)
  trustScore: {
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
  trustLevel: {
    type: String,
    default: 'Fair',
    enum: ['Excellent', 'Good', 'Fair', 'Risky', 'Very Poor']
  },
  totalTransactions: {
    type: Number,
    default: 0
  },
  lastTrustScoreUpdate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  return user;
};

// Method to update trust score fields (called from TrustScore middleware)
userSchema.methods.updateTrustScoreFields = function(trustScoreData) {
  this.trustScore = trustScoreData.currentScore;
  this.starRating = trustScoreData.starRating;
  this.trustLevel = trustScoreData.trustLevel;
  this.totalTransactions = trustScoreData.totalTransactions;
  this.lastTrustScoreUpdate = new Date();
};

// Static method to get trust level from score
userSchema.statics.getTrustLevel = function(score) {
  if (score >= 820) return 'Excellent';
  if (score >= 720) return 'Good';
  if (score >= 600) return 'Fair';
  if (score >= 450) return 'Risky';
  return 'Very Poor';
};

// Static method to get star rating from score
userSchema.statics.getStarRating = function(score) {
  if (score >= 820) return 5;
  if (score >= 720) return 4;
  if (score >= 600) return 3;
  if (score >= 450) return 2;
  return 1;
};

module.exports = mongoose.model('User', userSchema);