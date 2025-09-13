const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Electronics', 'Books', 'Medicines', 'Toiletries', 'Eatables']
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['buy', 'borrow']
  },
  maxPrice: {
    type: Number,
    required: function() {
      return this.transactionType === 'buy';
    }
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostel: {
    type: String,
    required: true
  },
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  responses: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item'
    },
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'fulfilled', 'closed'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

requestSchema.index({ title: 'text', description: 'text' });
requestSchema.index({ category: 1, hostel: 1, status: 1 });

module.exports = mongoose.model('Request', requestSchema);