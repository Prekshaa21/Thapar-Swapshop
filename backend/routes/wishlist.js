const express = require('express');
const Wishlist = require('../models/Wishlist');
const Item = require('../models/Item');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// Get user's wishlist
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;

    const wishlistItems = await Wishlist.find({ user: req.user._id })
      .populate({
        path: 'item',
        populate: {
          path: 'owner',
          select: 'name hostel roomNo'
        }
      })
      .sort({ addedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Filter out items that may have been deleted
    const validWishlistItems = wishlistItems.filter(wishlistItem => wishlistItem.item);

    const total = await Wishlist.countDocuments({ user: req.user._id });

    res.json({
      wishlistItems: validWishlistItems,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add item to wishlist
router.post('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    // Check if item exists and is active
    const item = await Item.findOne({ _id: itemId, isActive: true });
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if user is trying to add their own item
    if (item.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot add your own item to wishlist' });
    }

    // Check if already in wishlist
    const existingWishlistItem = await Wishlist.findOne({ 
      user: req.user._id, 
      item: itemId 
    });

    if (existingWishlistItem) {
      return res.status(400).json({ error: 'Item already in wishlist' });
    }

    // Add to wishlist
    const wishlistItem = new Wishlist({
      user: req.user._id,
      item: itemId
    });

    await wishlistItem.save();
    await wishlistItem.populate({
      path: 'item',
      populate: {
        path: 'owner',
        select: 'name hostel roomNo'
      }
    });

    res.status(201).json({
      message: 'Item added to wishlist',
      wishlistItem
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove item from wishlist
router.delete('/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    const result = await Wishlist.findOneAndDelete({ 
      user: req.user._id, 
      item: itemId 
    });

    if (!result) {
      return res.status(404).json({ error: 'Item not found in wishlist' });
    }

    res.json({ message: 'Item removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check if item is in user's wishlist
router.get('/check/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    const wishlistItem = await Wishlist.findOne({ 
      user: req.user._id, 
      item: itemId 
    });

    res.json({ inWishlist: !!wishlistItem });
  } catch (error) {
    console.error('Check wishlist error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get wishlist count
router.get('/count', async (req, res) => {
  try {
    const count = await Wishlist.countDocuments({ user: req.user._id });
    res.json({ count });
  } catch (error) {
    console.error('Get wishlist count error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;