const TrustScore = require('../models/TrustScore');
const User = require('../models/User');

/**
 * Trust Score Utility Functions for Thapar SwapShop
 * Implements the lightweight, fast-changing reputation model
 */

class TrustScoreUtils {
  
  /**
   * Initialize trust score for a new user
   * @param {String} userId - User ID
   * @returns {Object} Trust score document
   */
  static async initializeUserTrustScore(userId) {
    try {
      return await TrustScore.initializeForUser(userId);
    } catch (error) {
      console.error(`Failed to initialize trust score for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Get trust score for a user (create if doesn't exist)
   * @param {String} userId - User ID
   * @returns {Object} Trust score document
   */
  static async getUserTrustScore(userId) {
    try {
      let trustScore = await TrustScore.findOne({ user: userId }).populate('user', 'name email hostel');
      
      if (!trustScore) {
        trustScore = await this.initializeUserTrustScore(userId);
        await trustScore.populate('user', 'name email hostel');
      }
      
      return trustScore;
    } catch (error) {
      console.error(`Failed to get trust score for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Record a transaction and update trust score
   * @param {String} userId - User ID
   * @param {String} actionType - Type of action performed
   * @param {Object} transactionData - Additional transaction data
   * @returns {Object} Updated trust score
   */
  static async recordTransaction(userId, actionType, transactionData = {}) {
    try {
      const trustScore = await this.getUserTrustScore(userId);
      
      const transaction = {
        type: actionType,
        transactionId: transactionData.transactionId,
        requestId: transactionData.requestId,
        description: transactionData.description,
        adminNotes: transactionData.adminNotes,
        customImpact: transactionData.customImpact
      };
      
      trustScore.addTransaction(transaction);
      await trustScore.save();
      
      console.log(`Trust score updated for user ${userId}: ${actionType} (${trustScore.currentScore} pts, ${trustScore.starRating}★)`);
      return trustScore;
    } catch (error) {
      console.error(`Failed to record transaction for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Handle lending transaction completion (item returned on time)
   * @param {String} lenderId - Lender user ID
   * @param {String} borrowerId - Borrower user ID
   * @param {Object} transactionData - Transaction details
   */
  static async handleLendingSuccess(lenderId, borrowerId, transactionData = {}) {
    try {
      const promises = [];
      
      // Lender gets points for successful lending
      promises.push(
        this.recordTransaction(lenderId, 'lender_ontime_return', {
          ...transactionData,
          description: `Successfully lent item, returned on time`
        })
      );
      
      // Borrower gets points for returning on time
      promises.push(
        this.recordTransaction(borrowerId, 'borrower_ontime_return', {
          ...transactionData,
          description: `Returned borrowed item on time`
        })
      );
      
      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Failed to handle lending success:', error);
      throw error;
    }
  }

  /**
   * Handle early return bonus for borrower
   * @param {String} borrowerId - Borrower user ID
   * @param {Object} transactionData - Transaction details
   */
  static async handleEarlyReturn(borrowerId, transactionData = {}) {
    try {
      return await this.recordTransaction(borrowerId, 'borrower_early_return', {
        ...transactionData,
        description: `Returned borrowed item early`
      });
    } catch (error) {
      console.error('Failed to handle early return:', error);
      throw error;
    }
  }

  /**
   * Handle late return penalty
   * @param {String} borrowerId - Borrower user ID
   * @param {Object} transactionData - Transaction details
   */
  static async handleLateReturn(borrowerId, transactionData = {}) {
    try {
      return await this.recordTransaction(borrowerId, 'late_return', {
        ...transactionData,
        description: `Returned borrowed item late`
      });
    } catch (error) {
      console.error('Failed to handle late return:', error);
      throw error;
    }
  }

  /**
   * Handle non-return dispute (severe penalty)
   * @param {String} borrowerId - Borrower user ID
   * @param {Object} transactionData - Transaction details
   */
  static async handleNonReturn(borrowerId, transactionData = {}) {
    try {
      return await this.recordTransaction(borrowerId, 'non_return_dispute', {
        ...transactionData,
        description: `Failed to return borrowed item - dispute opened`
      });
    } catch (error) {
      console.error('Failed to handle non-return:', error);
      throw error;
    }
  }

  /**
   * Handle fulfilled request (user helps another user)
   * @param {String} helperId - User who fulfilled the request
   * @param {Object} requestData - Request details
   */
  static async handleFulfilledRequest(helperId, requestData = {}) {
    try {
      return await this.recordTransaction(helperId, 'fulfilled_request', {
        requestId: requestData.requestId,
        description: `Fulfilled another user's request: ${requestData.requestTitle || 'Item request'}`
      });
    } catch (error) {
      console.error('Failed to handle fulfilled request:', error);
      throw error;
    }
  }

  /**
   * Handle unfair cancellation by lender
   * @param {String} lenderId - Lender user ID
   * @param {Object} transactionData - Transaction details
   */
  static async handleUnfairCancel(lenderId, transactionData = {}) {
    try {
      return await this.recordTransaction(lenderId, 'lender_unfair_cancel', {
        ...transactionData,
        description: `Unfairly cancelled lending agreement`
      });
    } catch (error) {
      console.error('Failed to handle unfair cancel:', error);
      throw error;
    }
  }

  /**
   * Apply admin penalty
   * @param {String} userId - User ID
   * @param {Object} penaltyData - Penalty details
   */
  static async applyAdminPenalty(userId, penaltyData = {}) {
    try {
      return await this.recordTransaction(userId, 'admin_penalty', {
        description: penaltyData.reason || 'Admin penalty applied',
        adminNotes: penaltyData.adminNotes,
        customImpact: penaltyData.customImpact || -70
      });
    } catch (error) {
      console.error('Failed to apply admin penalty:', error);
      throw error;
    }
  }

  /**
   * Apply manual adjustment (admin override)
   * @param {String} userId - User ID
   * @param {Number} impact - Point adjustment (positive or negative)
   * @param {String} reason - Reason for adjustment
   * @param {String} adminNotes - Admin notes
   */
  static async applyManualAdjustment(userId, impact, reason, adminNotes = '') {
    try {
      return await this.recordTransaction(userId, 'manual_adjustment', {
        customImpact: impact,
        description: reason,
        adminNotes
      });
    } catch (error) {
      console.error('Failed to apply manual adjustment:', error);
      throw error;
    }
  }

  /**
   * Get trust score leaderboard
   * @param {Number} limit - Number of users to return
   * @returns {Array} Top users by trust score
   */
  static async getLeaderboard(limit = 10) {
    try {
      const topUsers = await TrustScore.find()
        .populate('user', 'name email hostel')
        .sort({ currentScore: -1 })
        .limit(limit)
        .lean();
      
      return topUsers.map(score => ({
        userId: score.user._id,
        name: score.user.name,
        email: score.user.email,
        hostel: score.user.hostel,
        trustScore: score.currentScore,
        starRating: score.starRating,
        trustLevel: this.getTrustLevel(score.currentScore),
        totalTransactions: score.totalTransactions
      }));
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      throw error;
    }
  }

  /**
   * Get trust level description from score
   * @param {Number} score - Trust score
   * @returns {String} Trust level description
   */
  static getTrustLevel(score) {
    if (score >= 820) return 'Excellent';
    if (score >= 720) return 'Good';
    if (score >= 600) return 'Fair';
    if (score >= 450) return 'Risky';
    return 'Very Poor';
  }

  /**
   * Get star rating from score
   * @param {Number} score - Trust score
   * @returns {Number} Star rating (1-5)
   */
  static getStarRating(score) {
    if (score >= 820) return 5;
    if (score >= 720) return 4;
    if (score >= 600) return 3;
    if (score >= 450) return 2;
    return 1;
  }

  /**
   * Check and apply inactivity penalties for all users
   * @returns {Array} Users who received penalties
   */
  static async processInactivityPenalties() {
    try {
      const allTrustScores = await TrustScore.find();
      const penalizedUsers = [];
      
      for (const trustScore of allTrustScores) {
        if (trustScore.applyInactivityPenalty()) {
          await trustScore.save();
          penalizedUsers.push({
            userId: trustScore.user,
            newScore: trustScore.currentScore,
            monthsInactive: trustScore.monthsInactive
          });
        }
      }
      
      console.log(`Applied inactivity penalties to ${penalizedUsers.length} users`);
      return penalizedUsers;
    } catch (error) {
      console.error('Failed to process inactivity penalties:', error);
      throw error;
    }
  }

  /**
   * Get trust score statistics
   * @returns {Object} Overall trust score statistics
   */
  static async getStatistics() {
    try {
      const stats = await TrustScore.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            averageScore: { $avg: '$currentScore' },
            highestScore: { $max: '$currentScore' },
            lowestScore: { $min: '$currentScore' },
            totalTransactions: { $sum: '$totalTransactions' },
            totalPositiveTransactions: { $sum: '$positiveTransactions' },
            totalNegativeTransactions: { $sum: '$negativeTransactions' },
            excellentUsers: { $sum: { $cond: [{ $gte: ['$currentScore', 820] }, 1, 0] } },
            goodUsers: { $sum: { $cond: [{ $and: [{ $gte: ['$currentScore', 720] }, { $lt: ['$currentScore', 820] }] }, 1, 0] } },
            fairUsers: { $sum: { $cond: [{ $and: [{ $gte: ['$currentScore', 600] }, { $lt: ['$currentScore', 720] }] }, 1, 0] } },
            riskyUsers: { $sum: { $cond: [{ $and: [{ $gte: ['$currentScore', 450] }, { $lt: ['$currentScore', 600] }] }, 1, 0] } },
            veryPoorUsers: { $sum: { $cond: [{ $lt: ['$currentScore', 450] }, 1, 0] } }
          }
        }
      ]);
      
      return stats[0] || {
        totalUsers: 0,
        averageScore: 650,
        highestScore: 650,
        lowestScore: 650,
        totalTransactions: 0,
        totalPositiveTransactions: 0,
        totalNegativeTransactions: 0,
        excellentUsers: 0,
        goodUsers: 0,
        fairUsers: 0,
        riskyUsers: 0,
        veryPoorUsers: 0
      };
    } catch (error) {
      console.error('Failed to get trust score statistics:', error);
      throw error;
    }
  }

  /**
   * Validate user eligibility for transactions based on trust score
   * @param {String} userId - User ID
   * @param {String} transactionType - 'borrow' or 'lend'
   * @returns {Object} Eligibility result
   */
  static async validateTransactionEligibility(userId, transactionType = 'borrow') {
    try {
      const trustScore = await this.getUserTrustScore(userId);
      
      const result = {
        eligible: true,
        trustScore: trustScore.currentScore,
        starRating: trustScore.starRating,
        trustLevel: trustScore.trustLevel,
        warnings: [],
        restrictions: []
      };
      
      // Apply restrictions based on trust level
      if (trustScore.currentScore < 450) {
        result.eligible = false;
        result.restrictions.push('Trust score too low for transactions');
      } else if (trustScore.currentScore < 500 && transactionType === 'borrow') {
        result.warnings.push('Low trust score - lenders may be cautious');
      }
      
      // Check for recent negative activity
      const recentTransactions = trustScore.getRecentTransactions();
      const recentNegative = recentTransactions.filter(t => t.impact < 0).length;
      
      if (recentNegative >= 2) {
        result.warnings.push('Recent negative activity detected');
      }
      
      // Check inactivity
      if (trustScore.monthsInactive >= 12) {
        result.warnings.push('Account has been inactive for over 12 months');
      }
      
      return result;
    } catch (error) {
      console.error('Failed to validate transaction eligibility:', error);
      throw error;
    }
  }
}

module.exports = TrustScoreUtils;