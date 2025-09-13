const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reportedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reportedItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    default: null
  },
  reportType: {
    type: String,
    enum: ['user', 'item'],
    required: true
  },
  reason: {
    type: String,
    enum: [
      'inappropriate_content',
      'spam',
      'fraud',
      'harassment',
      'fake_profile',
      'damaged_item',
      'misleading_description',
      'overpricing',
      'other'
    ],
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ reportedUser: 1 });
reportSchema.index({ reportedItem: 1 });

// Validation to ensure either reportedUser or reportedItem is provided
reportSchema.pre('validate', function(next) {
  if (!this.reportedUser && !this.reportedItem) {
    return next(new Error('Either reportedUser or reportedItem must be provided'));
  }
  
  if (this.reportedUser && this.reportedItem) {
    return next(new Error('Cannot report both user and item in the same report'));
  }
  
  next();
});

module.exports = mongoose.model('Report', reportSchema);