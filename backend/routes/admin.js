const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Item = require('../models/Item');
const Request = require('../models/Request');
const Transaction = require('../models/Transaction');
const Report = require('../models/Report');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalItems,
      availableItems,
      totalTransactions,
      activeTransactions,
      totalRequests,
      activeRequests
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      User.countDocuments({ role: 'user', isActive: true }),
      Item.countDocuments({ isActive: true }),
      Item.countDocuments({ isActive: true, isAvailable: true }),
      Transaction.countDocuments(),
      Transaction.countDocuments({ status: 'active' }),
      Request.countDocuments({ isActive: true }),
      Request.countDocuments({ isActive: true, status: 'active' })
    ]);

    const categoryStats = await Item.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const hostelStats = await User.aggregate([
      { $match: { role: 'user', isActive: true } },
      { $group: { _id: '$hostel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    const recentTransactions = await Transaction.find()
      .populate('item', 'name category')
      .populate('lender', 'name hostel')
      .populate('borrower', 'name hostel')
      .sort({ createdAt: -1 })
      .limit(10);

    // Transaction type distribution
    const transactionTypeStats = await Item.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$transactionType', count: { $sum: 1 } } }
    ]);

    // Daily activity for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyActivity = await Item.aggregate([
      { 
        $match: { 
          createdAt: { $gte: sevenDaysAgo },
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            type: "$transactionType"
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.date": 1 } }
    ]);

    // Active lenders and borrowers count
    const activeLenders = await Item.countDocuments({ 
      isActive: true, 
      isAvailable: true 
    });

    const activeBorrowers = await Item.countDocuments({ 
      isActive: true, 
      isAvailable: false,
      borrowedBy: { $ne: null }
    });

    res.json({
      stats: {
        users: { total: totalUsers, active: activeUsers },
        items: { total: totalItems, available: availableItems },
        transactions: { total: totalTransactions, active: activeTransactions },
        requests: { total: totalRequests, active: activeRequests },
        lending: { activeLenders, activeBorrowers }
      },
      categoryStats,
      hostelStats,
      recentTransactions,
      transactionTypeStats,
      dailyActivity
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// New endpoint for live statistics
router.get('/live-stats', async (req, res) => {
  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      newUsersToday,
      newItemsToday,
      newUsersThisWeek,
      newItemsThisWeek,
      activeUsersNow,
      onlineActivity
    ] = await Promise.all([
      User.countDocuments({ 
        role: 'user',
        createdAt: { $gte: oneDayAgo }
      }),
      Item.countDocuments({ 
        isActive: true,
        createdAt: { $gte: oneDayAgo }
      }),
      User.countDocuments({ 
        role: 'user',
        createdAt: { $gte: oneWeekAgo }
      }),
      Item.countDocuments({ 
        isActive: true,
        createdAt: { $gte: oneWeekAgo }
      }),
      User.countDocuments({ 
        role: 'user', 
        isActive: true 
      }),
      Item.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo },
            isActive: true
          }
        },
        {
          $group: {
            _id: { $dateToString: { format: "%H", date: "$createdAt" } },
            count: { $sum: 1 }
          }
        },
        { $sort: { "_id": 1 } }
      ])
    ]);

    res.json({
      today: { newUsers: newUsersToday, newItems: newItemsToday },
      thisWeek: { newUsers: newUsersThisWeek, newItems: newItemsThisWeek },
      activeUsers: activeUsersNow,
      onlineActivity
    });
  } catch (error) {
    console.error('Live stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Users by hostel endpoint
router.get('/users-by-hostel', async (req, res) => {
  try {
    const usersByHostel = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $group: {
          _id: '$hostel',
          users: {
            $push: {
              _id: '$_id',
              name: '$name',
              email: '$email',
              roomNo: '$roomNo',
              isActive: '$isActive',
              rewardPoints: '$rewardPoints',
              createdAt: '$createdAt'
            }
          },
          totalUsers: { $sum: 1 },
          activeUsers: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    res.json({ usersByHostel });
  } catch (error) {
    console.error('Users by hostel error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 20, hostel, status, search } = req.query;

    const query = { role: 'user' };

    if (hostel) query.hostel = hostel;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { roomNo: new RegExp(search, 'i') }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id/status', [
  body('isActive').isBoolean().withMessage('isActive must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findOne({ _id: req.params.id, role: 'user' });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.isActive = req.body.isActive;
    await user.save();

    res.json({
      message: `User ${req.body.isActive ? 'activated' : 'deactivated'} successfully`,
      user: { _id: user._id, name: user.name, email: user.email, isActive: user.isActive }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/items', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, hostel, status, search } = req.query;

    const query = {};

    if (category) query.category = category;
    if (hostel) query.hostel = hostel;
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    if (search) {
      query.$text = { $search: search };
    }

    const items = await Item.find(query)
      .populate('owner', 'name hostel roomNo email')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Item.countDocuments(query);

    res.json({
      items,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get admin items error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    item.isActive = false;
    await item.save();

    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/requests', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, hostel, status, search } = req.query;

    const query = {};

    if (category) query.category = category;
    if (hostel) query.hostel = hostel;
    if (status) query.status = status;

    if (search) {
      query.$text = { $search: search };
    }

    const requests = await Request.find(query)
      .populate('requester', 'name hostel roomNo email')
      .populate('responses.user', 'name hostel roomNo')
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Request.countDocuments(query);

    res.json({
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get admin requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/requests/:id', async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    request.isActive = false;
    await request.save();

    res.json({ message: 'Request removed successfully' });
  } catch (error) {
    console.error('Remove request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/users/:id/reward-points', [
  body('points').isNumeric().withMessage('Points must be a number'),
  body('reason').optional().trim().isLength({ min: 5 }).withMessage('Reason must be at least 5 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { points, reason } = req.body;
    const user = await User.findOne({ _id: req.params.id, role: 'user' });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.rewardPoints = Math.max(0, user.rewardPoints + Number(points));
    await user.save();

    res.json({
      message: 'Reward points updated successfully',
      user: { 
        _id: user._id, 
        name: user.name, 
        rewardPoints: user.rewardPoints 
      },
      reason: reason || 'Admin adjustment'
    });
  } catch (error) {
    console.error('Update reward points error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reports management
router.get('/reports', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, reportType, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (reportType) query.reportType = reportType;

    const reports = await Report.find(query)
      .populate([
        { path: 'reporter', select: 'name email hostel' },
        { path: 'reportedUser', select: 'name email hostel' },
        { path: 'reportedItem', select: 'name description category owner', populate: { path: 'owner', select: 'name' } },
        { path: 'reviewedBy', select: 'name' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(query);

    // Get report counts by status
    const statusCounts = await Report.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      total,
      statusCounts: statusCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/reports/:id/status', [
  body('status').isIn(['pending', 'reviewing', 'resolved', 'dismissed']).withMessage('Invalid status'),
  body('adminNotes').optional().trim().isLength({ max: 1000 }).withMessage('Admin notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { status, adminNotes } = req.body;
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.status = status;
    if (adminNotes) report.adminNotes = adminNotes;
    report.reviewedBy = req.user.userId;
    report.reviewedAt = new Date();

    await report.save();

    await report.populate([
      { path: 'reporter', select: 'name email' },
      { path: 'reportedUser', select: 'name email' },
      { path: 'reportedItem', select: 'name category owner', populate: { path: 'owner', select: 'name' } },
      { path: 'reviewedBy', select: 'name' }
    ]);

    res.json({
      message: 'Report status updated successfully',
      report
    });
  } catch (error) {
    console.error('Update report status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/reports/:id', async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    report.isActive = false;
    await report.save();

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;