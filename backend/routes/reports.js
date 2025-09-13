const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/User');
const Item = require('../models/Item');
const auth = require('../middleware/auth');

// Create a new report
router.post('/', auth, async (req, res) => {
  try {
    const { reportType, reportedUserId, reportedItemId, reason, description } = req.body;

    // Validation
    if (!reportType || !reason || !description) {
      return res.status(400).json({ message: 'Report type, reason, and description are required' });
    }

    if (reportType === 'user' && !reportedUserId) {
      return res.status(400).json({ message: 'Reported user ID is required for user reports' });
    }

    if (reportType === 'item' && !reportedItemId) {
      return res.status(400).json({ message: 'Reported item ID is required for item reports' });
    }

    // Prevent self-reporting
    if (reportType === 'user' && reportedUserId === req.user.userId) {
      return res.status(400).json({ message: 'You cannot report yourself' });
    }

    // Check if reported user/item exists
    if (reportType === 'user') {
      const reportedUser = await User.findById(reportedUserId);
      if (!reportedUser) {
        return res.status(404).json({ message: 'Reported user not found' });
      }
    }

    if (reportType === 'item') {
      const reportedItem = await Item.findById(reportedItemId);
      if (!reportedItem) {
        return res.status(404).json({ message: 'Reported item not found' });
      }

      // Prevent reporting own items
      if (reportedItem.owner.toString() === req.user.userId) {
        return res.status(400).json({ message: 'You cannot report your own item' });
      }
    }

    // Check for duplicate reports (same reporter, same target, within 24 hours)
    const existingReport = await Report.findOne({
      reporter: req.user.userId,
      ...(reportType === 'user' ? { reportedUser: reportedUserId } : { reportedItem: reportedItemId }),
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      status: { $in: ['pending', 'reviewing'] }
    });

    if (existingReport) {
      return res.status(409).json({ message: 'You have already reported this within the last 24 hours' });
    }

    const report = new Report({
      reporter: req.user.userId,
      ...(reportType === 'user' ? { reportedUser: reportedUserId } : { reportedItem: reportedItemId }),
      reportType,
      reason,
      description: description.trim()
    });

    await report.save();

    // Populate the report for response
    await report.populate([
      { path: 'reporter', select: 'name email' },
      ...(reportType === 'user' ? [{ path: 'reportedUser', select: 'name email' }] : []),
      ...(reportType === 'item' ? [{ path: 'reportedItem', select: 'name description owner' }] : [])
    ]);

    res.status(201).json({
      message: 'Report submitted successfully',
      report
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user's own reports
router.get('/my-reports', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { reporter: req.user.userId };
    if (status) {
      query.status = status;
    }

    const reports = await Report.find(query)
      .populate([
        { path: 'reportedUser', select: 'name' },
        { path: 'reportedItem', select: 'name' },
        { path: 'reviewedBy', select: 'name' }
      ])
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(query);

    res.json({
      reports,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;