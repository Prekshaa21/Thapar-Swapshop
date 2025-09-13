const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: {
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
    enum: ['Electronics', 'Books', 'Medicines', 'Toiletries', 'Eatables', 'Other']
  },
  images: [{
    type: String
  }],
  condition: {
    type: String,
    required: true,
    enum: ['New', 'Like New', 'Good', 'Fair', 'Poor']
  },
  transactionType: {
    type: String,
    required: true,
    enum: ['sell', 'lend']
  },
  price: {
    type: Number,
    required: function() {
      return this.transactionType === 'sell';
    }
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hostel: {
    type: String,
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  borrowedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  borrowedAt: {
    type: Date,
    default: null
  },
  expectedReturnDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

itemSchema.index({ name: 'text', description: 'text' });
itemSchema.index({ category: 1, hostel: 1, isAvailable: 1 });

module.exports = mongoose.model('Item', itemSchema);