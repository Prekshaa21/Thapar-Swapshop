const TrustScoreUtils = require('../utils/trustScoreUtils');
const User = require('../models/User');

/**
 * Trust Score Middleware
 * Automatically updates trust scores when relevant actions occur
 */

/**
 * Initialize trust score for new users
 */
const initializeTrustScore = async (req, res, next) => {
  try {
    if (req.user && req.user.userId) {
      // Check if this is a new user registration or login
      const user = await User.findById(req.user.userId);
      if (user && !user.lastTrustScoreUpdate) {
        // Initialize trust score for new user
        const trustScore = await TrustScoreUtils.initializeUserTrustScore(req.user.userId);
        
        // Update user model with trust score data
        user.updateTrustScoreFields({
          currentScore: trustScore.currentScore,
          starRating: trustScore.starRating,
          trustLevel: trustScore.trustLevel,
          totalTransactions: trustScore.totalTransactions
        });
        
        await user.save();
        console.log(`Trust score initialized for new user: ${user.email}`);
      }
    }
    next();
  } catch (error) {
    console.error('Trust score initialization error:', error);
    // Don't block the request, just log the error
    next();
  }
};

/**
 * Update trust score after transaction completion
 * Used in transaction-related routes
 */
const updateTrustScoreAfterTransaction = (actionType) => {
  return async (req, res, next) => {
    try {
      // Store the original response.json method
      const originalJson = res.json;
      
      // Override res.json to capture successful responses
      res.json = async function(body) {
        // Only update trust scores if the response is successful
        if (body && body.success) {
          try {
            await handleTrustScoreUpdate(actionType, req, body);
          } catch (trustScoreError) {
            console.error('Trust score update error:', trustScoreError);
            // Don't affect the main response
          }
        }
        
        // Call the original json method
        return originalJson.call(this, body);
      };
      
      next();
    } catch (error) {
      console.error('Trust score middleware error:', error);
      next();
    }
  };
};

/**
 * Handle the actual trust score update based on action type
 */
const handleTrustScoreUpdate = async (actionType, req, responseBody) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return;
    
    let updatePromises = [];
    
    switch (actionType) {
      case 'item_returned_ontime':
        // Both lender and borrower get points
        const { lenderId, borrowerId, transactionId } = responseBody;
        if (lenderId && borrowerId) {
          updatePromises.push(
            TrustScoreUtils.handleLendingSuccess(lenderId, borrowerId, {
              transactionId,
              description: 'Item lending completed successfully'
            })
          );
        }
        break;
        
      case 'item_returned_early':
        const { borrowerId: earlyBorrowerId, transactionId: earlyTransactionId } = responseBody;
        if (earlyBorrowerId) {
          updatePromises.push(
            TrustScoreUtils.handleEarlyReturn(earlyBorrowerId, {
              transactionId: earlyTransactionId,
              description: 'Item returned early'
            })
          );
        }
        break;
        
      case 'item_returned_late':
        const { borrowerId: lateBorrowerId, transactionId: lateTransactionId } = responseBody;
        if (lateBorrowerId) {
          updatePromises.push(
            TrustScoreUtils.handleLateReturn(lateBorrowerId, {
              transactionId: lateTransactionId,
              description: 'Item returned late'
            })
          );
        }
        break;
        
      case 'item_not_returned':
        const { borrowerId: nonReturnBorrowerId, transactionId: nonReturnTransactionId } = responseBody;
        if (nonReturnBorrowerId) {
          updatePromises.push(
            TrustScoreUtils.handleNonReturn(nonReturnBorrowerId, {
              transactionId: nonReturnTransactionId,
              description: 'Item not returned - dispute opened'
            })
          );
        }
        break;
        
      case 'request_fulfilled':
        const { helperId, requestId } = responseBody;
        if (helperId) {
          updatePromises.push(
            TrustScoreUtils.handleFulfilledRequest(helperId, {
              requestId,
              requestTitle: responseBody.requestTitle
            })
          );
        }
        break;
        
      case 'lending_cancelled_unfairly':
        const { lenderId: cancelLenderId, transactionId: cancelTransactionId } = responseBody;
        if (cancelLenderId) {
          updatePromises.push(
            TrustScoreUtils.handleUnfairCancel(cancelLenderId, {
              transactionId: cancelTransactionId,
              description: 'Unfairly cancelled lending agreement'
            })
          );
        }
        break;
        
      default:
        console.log(`No trust score update handler for action: ${actionType}`);
        return;
    }
    
    // Execute all trust score updates
    if (updatePromises.length > 0) {
      const results = await Promise.all(updatePromises);
      
      // Update user model fields for quick access
      for (const trustScore of results.flat()) {
        if (trustScore && trustScore.user) {
          const user = await User.findById(trustScore.user);
          if (user) {
            user.updateTrustScoreFields({
              currentScore: trustScore.currentScore,
              starRating: trustScore.starRating,
              trustLevel: trustScore.trustLevel,
              totalTransactions: trustScore.totalTransactions
            });
            await user.save();
          }
        }
      }
      
      console.log(`Trust scores updated for action: ${actionType}`);
    }
  } catch (error) {
    console.error('Error handling trust score update:', error);
    // Don't throw error to avoid affecting main functionality
  }
};

/**
 * Check user eligibility before allowing transactions
 */
const checkTransactionEligibility = (transactionType = 'borrow') => {
  return async (req, res, next) => {
    try {
      if (!req.user?.userId) {
        return next();
      }
      
      const eligibility = await TrustScoreUtils.validateTransactionEligibility(
        req.user.userId,
        transactionType
      );
      
      if (!eligibility.eligible) {
        return res.status(403).json({
          success: false,
          message: 'Transaction not allowed due to trust score restrictions',
          eligibility
        });
      }
      
      // Add eligibility info to request for potential use
      req.eligibility = eligibility;
      next();
    } catch (error) {
      console.error('Transaction eligibility check error:', error);
      // Don't block the request, just proceed
      next();
    }
  };
};

/**
 * Sync trust score from TrustScore model to User model
 * Used in admin operations or periodic syncs
 */
const syncTrustScoreToUser = async (userId) => {
  try {
    const trustScore = await TrustScoreUtils.getUserTrustScore(userId);
    const user = await User.findById(userId);
    
    if (user && trustScore) {
      user.updateTrustScoreFields({
        currentScore: trustScore.currentScore,
        starRating: trustScore.starRating,
        trustLevel: trustScore.trustLevel,
        totalTransactions: trustScore.totalTransactions
      });
      
      await user.save();
      return user;
    }
  } catch (error) {
    console.error('Error syncing trust score to user:', error);
    throw error;
  }
};

/**
 * Batch sync all users' trust scores (for admin operations)
 */
const batchSyncTrustScores = async () => {
  try {
    const users = await User.find();
    const syncPromises = users.map(user => syncTrustScoreToUser(user._id));
    
    const results = await Promise.allSettled(syncPromises);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`Trust score batch sync completed: ${successful} successful, ${failed} failed`);
    return { successful, failed };
  } catch (error) {
    console.error('Error in batch trust score sync:', error);
    throw error;
  }
};

module.exports = {
  initializeTrustScore,
  updateTrustScoreAfterTransaction,
  checkTransactionEligibility,
  syncTrustScoreToUser,
  batchSyncTrustScores
};