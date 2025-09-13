const express = require('express');
const { body, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');
const Item = require('../models/Item');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const calculateRewardPoints = (transactionType, daysUsed = 0) => {
  const basePoints = transactionType === 'sale' ? 5 : 10;
  const responsibleReturnBonus = daysUsed <= 7 ? 5 : 0;
  return {
    lender: basePoints,
    borrower: responsibleReturnBonus
  };
};

router.post('/', [
  authMiddleware,
  body('itemId').isMongoId().withMessage('Invalid item ID'),
  body('transactionType').isIn(['sale', 'borrow']).withMessage('Invalid transaction type'),
  body('expectedReturnDate').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId, transactionType, expectedReturnDate } = req.body;

    const item = await Item.findOne({ 
      _id: itemId, 
      isActive: true, 
      isAvailable: true 
    }).populate('owner');

    if (!item) {
      return res.status(404).json({ error: 'Item not found or not available' });
    }

    if (item.owner._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot create transaction with your own item' });
    }

    if (transactionType === 'sale' && item.transactionType !== 'sell') {
      return res.status(400).json({ error: 'Item is not for sale' });
    }

    if (transactionType === 'borrow') {
      if (item.transactionType !== 'lend') {
        return res.status(400).json({ error: 'Item is not for lending' });
      }
      if (!expectedReturnDate) {
        return res.status(400).json({ error: 'Expected return date is required for borrowing' });
      }
    }

    const transaction = new Transaction({
      item: itemId,
      lender: item.owner._id,
      borrower: req.user._id,
      transactionType,
      amount: transactionType === 'sale' ? item.price : undefined,
      expectedReturnDate: transactionType === 'borrow' ? new Date(expectedReturnDate) : undefined
    });

    await transaction.save();

    item.isAvailable = false;
    if (transactionType === 'borrow') {
      item.borrowedBy = req.user._id;
      item.borrowedAt = new Date();
      item.expectedReturnDate = new Date(expectedReturnDate);
    }
    await item.save();

    await transaction.populate([
      { path: 'item', select: 'name category images condition' },
      { path: 'lender', select: 'name hostel roomNo email' },
      { path: 'borrower', select: 'name hostel roomNo email' }
    ]);

    res.status(201).json({
      message: 'Transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/return', [
  authMiddleware,
  body('returnDate').optional().isISO8601().withMessage('Invalid date format')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const transaction = await Transaction.findOne({ 
      _id: req.params.id,
      status: 'active',
      transactionType: 'borrow'
    }).populate('item');

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found or not active' });
    }

    const isLender = transaction.lender.toString() === req.user._id.toString();
    const isBorrower = transaction.borrower.toString() === req.user._id.toString();

    if (!isLender && !isBorrower) {
      return res.status(403).json({ error: 'Unauthorized to update this transaction' });
    }

    const returnDate = req.body.returnDate ? new Date(req.body.returnDate) : new Date();

    if (isLender) {
      transaction.lenderConfirmation = true;
    }
    if (isBorrower) {
      transaction.borrowerConfirmation = true;
    }

    if (transaction.lenderConfirmation && transaction.borrowerConfirmation) {
      transaction.status = 'returned';
      transaction.actualReturnDate = returnDate;

      const daysUsed = Math.ceil((returnDate - transaction.startDate) / (1000 * 60 * 60 * 24));
      const rewardPoints = calculateRewardPoints('borrow', daysUsed);
      
      transaction.rewardPointsEarned = rewardPoints;

      await Promise.all([
        User.findByIdAndUpdate(transaction.lender, { 
          $inc: { rewardPoints: rewardPoints.lender } 
        }),
        User.findByIdAndUpdate(transaction.borrower, { 
          $inc: { rewardPoints: rewardPoints.borrower } 
        })
      ]);

      const item = transaction.item;
      item.isAvailable = true;
      item.borrowedBy = null;
      item.borrowedAt = null;
      item.expectedReturnDate = null;
      await item.save();
    }

    await transaction.save();
    await transaction.populate([
      { path: 'item', select: 'name category images' },
      { path: 'lender', select: 'name hostel roomNo' },
      { path: 'borrower', select: 'name hostel roomNo' }
    ]);

    res.json({
      message: 'Return confirmation updated successfully',
      transaction
    });
  } catch (error) {
    console.error('Return transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, type } = req.query;
    const userId = req.user._id;

    const query = {
      $or: [{ lender: userId }, { borrower: userId }]
    };

    if (status) query.status = status;
    if (type === 'lent') query.lender = userId;
    if (type === 'borrowed') query.borrower = userId;

    const transactions = await Transaction.find(query)
      .populate('item', 'name category images condition')
      .populate('lender', 'name hostel roomNo')
      .populate('borrower', 'name hostel roomNo')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      $or: [{ lender: req.user._id }, { borrower: req.user._id }]
    }).populate([
      { path: 'item', select: 'name category images condition description' },
      { path: 'lender', select: 'name hostel roomNo email' },
      { path: 'borrower', select: 'name hostel roomNo email' }
    ]);

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;