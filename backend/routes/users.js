const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Item = require('../models/Item');
const Transaction = require('../models/Transaction');
const Request = require('../models/Request');
const { authMiddleware } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../utils/cloudinary');

const router = express.Router();

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', [
  authMiddleware,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('hostel').optional().isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P']).withMessage('Please select a valid hostel'),
  body('roomNo').optional().trim().isLength({ min: 1 }).withMessage('Room number is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, hostel, roomNo } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (hostel) user.hostel = hostel;
    if (roomNo) user.roomNo = roomNo;

    await user.save();
    res.json({ message: 'Profile updated successfully', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/profile-image', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const result = await uploadToCloudinary(req.file.buffer, 'thapar-swapshop/profiles');
    
    const user = await User.findById(req.user._id);
    user.profileImage = result.secure_url;
    await user.save();

    res.json({ 
      message: 'Profile image updated successfully', 
      profileImage: result.secure_url 
    });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/dashboard-stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const [myItems, myTransactions, myRequests] = await Promise.all([
      Item.countDocuments({ owner: userId, isActive: true }),
      Transaction.countDocuments({ 
        $or: [{ lender: userId }, { borrower: userId }] 
      }),
      Request.countDocuments({ requester: userId, isActive: true })
    ]);

    const activeTransactions = await Transaction.countDocuments({
      $or: [{ lender: userId }, { borrower: userId }],
      status: 'active'
    });

    res.json({
      stats: {
        myItems,
        totalTransactions: myTransactions,
        activeTransactions,
        myRequests,
        rewardPoints: req.user.rewardPoints
      }
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10, status } = req.query;

    const query = {
      $or: [{ lender: userId }, { borrower: userId }]
    };

    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .populate('item', 'name category images')
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

module.exports = router;