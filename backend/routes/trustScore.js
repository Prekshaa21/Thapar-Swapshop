const express = require('express');
const router = express.Router();
const TrustScore = require('../models/TrustScore');
const TrustScoreUtils = require('../utils/trustScoreUtils');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

/**
 * Trust Score API Routes
 * Handles all trust score related operations for Thapar SwapShop
 */

// Get current user's trust score
router.get('/me', auth, async (req, res) => {
  try {
    const trustScore = await TrustScoreUtils.getUserTrustScore(req.user.userId);
    const summary = trustScore.getSummary();
    
    res.json({
      success: true,
      trustScore: summary
    });
  } catch (error) {
    console.error('Error fetching user trust score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trust score',
      error: error.message
    });
  }
});

// Get trust score for specific user (public)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const trustScore = await TrustScoreUtils.getUserTrustScore(userId);
    
    // Return public summary (hide sensitive details)
    const publicSummary = {
      userId: trustScore.user,
      currentScore: trustScore.currentScore,
      starRating: trustScore.starRating,
      trustLevel: trustScore.trustLevel,
      totalTransactions: trustScore.totalTransactions,
      positiveTransactions: trustScore.positiveTransactions,
      lastActivityAt: trustScore.lastActivityAt,
      isFirstTransaction: trustScore.isFirstTransaction
    };
    
    res.json({
      success: true,
      trustScore: publicSummary
    });
  } catch (error) {
    console.error('Error fetching user trust score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trust score',
      error: error.message
    });
  }
});

// Get detailed trust score with transaction history
router.get('/detailed', auth, async (req, res) => {
  try {
    console.log('📊 Detailed trust score request from user:', req.user?.userId);
    const trustScore = await TrustScoreUtils.getUserTrustScore(req.user.userId);
    console.log('✅ Trust score found:', trustScore.currentScore, 'points');
    
    // Include full transaction history for own profile
    res.json({
      success: true,
      trustScore: {
        ...trustScore.getSummary(),
        allTransactions: trustScore.transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching detailed trust score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed trust score',
      error: error.message
    });
  }
});

// Initialize trust score for current user
router.post('/initialize', auth, async (req, res) => {
  try {
    const trustScore = await TrustScoreUtils.initializeUserTrustScore(req.user.userId);
    const summary = trustScore.getSummary();
    
    res.json({
      success: true,
      message: 'Trust score initialized successfully',
      trustScore: summary
    });
  } catch (error) {
    console.error('Error initializing trust score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize trust score',
      error: error.message
    });
  }
});

// Check transaction eligibility
router.get('/eligibility/:transactionType?', auth, async (req, res) => {
  try {
    const transactionType = req.params.transactionType || 'borrow';
    const eligibility = await TrustScoreUtils.validateTransactionEligibility(
      req.user.userId,
      transactionType
    );
    
    res.json({
      success: true,
      eligibility
    });
  } catch (error) {
    console.error('Error checking transaction eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check eligibility',
      error: error.message
    });
  }
});

// Get trust score leaderboard
router.get('/leaderboard', auth, async (req, res) => {
  try {
    console.log('🏆 Leaderboard request received from user:', req.user?.userId);
    const limit = parseInt(req.query.limit) || 10;
    console.log('📊 Fetching leaderboard with limit:', limit);
    
    const leaderboard = await TrustScoreUtils.getLeaderboard(limit);
    console.log('✅ Leaderboard fetched:', leaderboard.length, 'entries');
    
    res.json({
      success: true,
      leaderboard
    });
  } catch (error) {
    console.error('❌ Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard',
      error: error.message
    });
  }
});

// Get trust score statistics
router.get('/statistics', auth, async (req, res) => {
  try {
    const stats = await TrustScoreUtils.getStatistics();
    
    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

// === ADMIN ROUTES ===

// Get all trust scores (admin only)
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sortBy || 'currentScore';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
    
    const query = {};
    
    // Filter by trust level if specified
    if (req.query.trustLevel) {
      const { trustLevel } = req.query;
      switch (trustLevel) {
        case 'excellent':
          query.currentScore = { $gte: 820 };
          break;
        case 'good':
          query.currentScore = { $gte: 720, $lt: 820 };
          break;
        case 'fair':
          query.currentScore = { $gte: 600, $lt: 720 };
          break;
        case 'risky':
          query.currentScore = { $gte: 450, $lt: 600 };
          break;
        case 'very_poor':
          query.currentScore = { $lt: 450 };
          break;
      }
    }
    
    const skip = (page - 1) * limit;
    
    const [trustScores, total] = await Promise.all([
      TrustScore.find(query)
        .populate('user', 'name email hostel')
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      TrustScore.countDocuments(query)
    ]);
    
    const results = trustScores.map(score => ({
      _id: score._id,
      userId: score.user._id,
      name: score.user.name,
      email: score.user.email,
      hostel: score.user.hostel,
      currentScore: score.currentScore,
      starRating: score.starRating,
      trustLevel: TrustScoreUtils.getTrustLevel(score.currentScore),
      totalTransactions: score.totalTransactions,
      positiveTransactions: score.positiveTransactions,
      negativeTransactions: score.negativeTransactions,
      lastActivityAt: score.lastActivityAt,
      monthsInactive: score.monthsInactive,
      isFirstTransaction: score.isFirstTransaction
    }));
    
    res.json({
      success: true,
      trustScores: results,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        count: results.length,
        totalCount: total
      }
    });
  } catch (error) {
    console.error('Error fetching all trust scores:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trust scores',
      error: error.message
    });
  }
});

// Get detailed trust score for admin
router.get('/admin/user/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const trustScore = await TrustScore.findOne({ user: userId })
      .populate('user', 'name email hostel')
      .populate('transactions.transactionId')
      .populate('transactions.requestId');
    
    if (!trustScore) {
      return res.status(404).json({
        success: false,
        message: 'Trust score not found'
      });
    }
    
    res.json({
      success: true,
      trustScore: {
        ...trustScore.toObject(),
        trustLevel: trustScore.trustLevel
      }
    });
  } catch (error) {
    console.error('Error fetching admin trust score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trust score',
      error: error.message
    });
  }
});

// Apply manual adjustment (admin only)
router.post('/admin/adjust', adminAuth, async (req, res) => {
  try {
    const { userId, impact, reason, adminNotes } = req.body;
    
    // Validation
    if (!userId || impact === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, impact, reason'
      });
    }
    
    if (Math.abs(impact) > 200) {
      return res.status(400).json({
        success: false,
        message: 'Impact too large. Maximum adjustment is ±200 points'
      });
    }
    
    const updatedTrustScore = await TrustScoreUtils.applyManualAdjustment(
      userId,
      impact,
      reason,
      adminNotes || `Manual adjustment by admin. Reason: ${reason}`
    );
    
    res.json({
      success: true,
      message: 'Trust score adjusted successfully',
      trustScore: updatedTrustScore.getSummary()
    });
  } catch (error) {
    console.error('Error applying manual adjustment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply adjustment',
      error: error.message
    });
  }
});

// Apply admin penalty
router.post('/admin/penalty', adminAuth, async (req, res) => {
  try {
    const { userId, reason, adminNotes, customImpact } = req.body;
    
    // Validation
    if (!userId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, reason'
      });
    }
    
    const updatedTrustScore = await TrustScoreUtils.applyAdminPenalty(userId, {
      reason,
      adminNotes,
      customImpact: customImpact || -70
    });
    
    res.json({
      success: true,
      message: 'Admin penalty applied successfully',
      trustScore: updatedTrustScore.getSummary()
    });
  } catch (error) {
    console.error('Error applying admin penalty:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to apply penalty',
      error: error.message
    });
  }
});

// Process inactivity penalties
router.post('/admin/process-inactivity', adminAuth, async (req, res) => {
  try {
    const penalizedUsers = await TrustScoreUtils.processInactivityPenalties();
    
    res.json({
      success: true,
      message: `Processed inactivity penalties for ${penalizedUsers.length} users`,
      penalizedUsers
    });
  } catch (error) {
    console.error('Error processing inactivity penalties:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process inactivity penalties',
      error: error.message
    });
  }
});

// Initialize trust scores for all users (admin only)
router.post('/admin/initialize-all', adminAuth, async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find();
    
    const results = {
      initialized: 0,
      existing: 0,
      errors: 0
    };
    
    for (const user of users) {
      try {
        const trustScore = await TrustScoreUtils.getUserTrustScore(user._id);
        
        if (trustScore.totalTransactions === 0 && trustScore.transactions.length === 0) {
          // New trust score was created
          results.initialized++;
          
          // Update user model with trust score data
          user.updateTrustScoreFields({
            currentScore: trustScore.currentScore,
            starRating: trustScore.starRating,
            trustLevel: trustScore.trustLevel,
            totalTransactions: trustScore.totalTransactions
          });
          
          await user.save();
        } else {
          // Trust score already exists
          results.existing++;
        }
      } catch (error) {
        console.error(`Error initializing trust score for user ${user._id}:`, error);
        results.errors++;
      }
    }
    
    res.json({
      success: true,
      message: `Trust score initialization complete. Initialized: ${results.initialized}, Existing: ${results.existing}, Errors: ${results.errors}`,
      results
    });
  } catch (error) {
    console.error('Error initializing trust scores for all users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize trust scores',
      error: error.message
    });
  }
});

// Reset trust score (admin only)
router.post('/admin/reset/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Reason for reset is required'
      });
    }
    
    // Delete existing trust score and create new one
    await TrustScore.findOneAndDelete({ user: userId });
    const newTrustScore = await TrustScoreUtils.initializeUserTrustScore(userId);
    
    // Add a transaction record for the reset
    newTrustScore.addTransaction({
      type: 'manual_adjustment',
      customImpact: 0,
      description: `Trust score reset by admin. Reason: ${reason}`,
      adminNotes: `Reset performed by admin on ${new Date().toISOString()}`
    });
    
    await newTrustScore.save();
    
    res.json({
      success: true,
      message: 'Trust score reset successfully',
      trustScore: newTrustScore.getSummary()
    });
  } catch (error) {
    console.error('Error resetting trust score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset trust score',
      error: error.message
    });
  }
});

// Test route to add sample trust score data (development only)
router.post('/admin/add-test-data', adminAuth, async (req, res) => {
  try {
    const User = require('../models/User');
    const users = await User.find().limit(5); // Get first 5 users
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No users found to add test data'
      });
    }
    
    const testTransactions = [
      { type: 'lender_ontime_return', description: 'Successfully lent textbook, returned on time' },
      { type: 'borrower_ontime_return', description: 'Borrowed calculator, returned on time' },
      { type: 'fulfilled_request', description: 'Helped student with medicine request' },
      { type: 'borrower_early_return', description: 'Returned laptop charger early' },
      { type: 'lender_ontime_return', description: 'Lent sports equipment, returned on time' },
      { type: 'late_return', description: 'Returned book 2 days late' },
      { type: 'borrower_ontime_return', description: 'Borrowed headphones, returned on time' },
    ];
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const trustScore = await TrustScoreUtils.getUserTrustScore(user._id);
      
      // Add 2-4 random transactions per user
      const numTransactions = Math.floor(Math.random() * 3) + 2;
      
      for (let j = 0; j < numTransactions; j++) {
        const randomTransaction = testTransactions[Math.floor(Math.random() * testTransactions.length)];
        trustScore.addTransaction({
          type: randomTransaction.type,
          description: randomTransaction.description,
          transactionId: null,
          requestId: null
        });
      }
      
      await trustScore.save();
      
      // Update user model
      user.updateTrustScoreFields({
        currentScore: trustScore.currentScore,
        starRating: trustScore.starRating,
        trustLevel: trustScore.trustLevel,
        totalTransactions: trustScore.totalTransactions
      });
      
      await user.save();
    }
    
    res.json({
      success: true,
      message: `Added test trust score data for ${users.length} users`,
      usersUpdated: users.length
    });
  } catch (error) {
    console.error('Error adding test trust score data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add test data',
      error: error.message
    });
  }
});

module.exports = router;