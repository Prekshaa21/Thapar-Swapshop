const express = require('express');
const { body, validationResult } = require('express-validator');
const Item = require('../models/Item');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { upload, uploadToCloudinary } = require('../utils/cloudinary');

const router = express.Router();

router.post('/', [
  authMiddleware,
  body('name').trim().isLength({ min: 2 }).withMessage('Item name must be at least 2 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category').isIn(['Electronics', 'Books', 'Medicines', 'Toiletries', 'Eatables', 'Other']).withMessage('Please select a valid category'),
  body('condition').isIn(['New', 'Like New', 'Good', 'Fair', 'Poor']).withMessage('Please select a valid condition'),
  body('transactionType').isIn(['sell', 'lend']).withMessage('Please select a valid transaction type'),
  body('price').optional().isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  console.log('POST /api/items - Request received');
  console.log('Request body:', req.body);
  console.log('Request user:', req.user);
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, category, condition, transactionType, price } = req.body;
    
    if (transactionType === 'sell' && !price) {
      return res.status(400).json({ error: 'Price is required for items being sold' });
    }

    let imageUrls = [];
    console.log('Skipping image upload for now...');

    const item = new Item({
      name,
      description,
      category,
      condition,
      transactionType,
      price: transactionType === 'sell' ? price : undefined,
      owner: req.user._id,
      hostel: req.user.hostel || 'A',
      images: imageUrls
    });

    await item.save();
    await item.populate('owner', 'name hostel roomNo');

    res.status(201).json({
      message: 'Item created successfully',
      item
    });
  } catch (error) {
    console.error('Create item error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      hostel, 
      transactionType, 
      search,
      condition,
      priceMin,
      priceMax
    } = req.query;

    const query = { isActive: true, isAvailable: true };

    if (category) query.category = category;
    if (hostel) query.hostel = hostel;
    if (transactionType) query.transactionType = transactionType;
    if (condition) query.condition = condition;

    if (priceMin || priceMax) {
      query.price = {};
      if (priceMin) query.price.$gte = Number(priceMin);
      if (priceMax) query.price.$lte = Number(priceMax);
    }

    if (search) {
      query.$text = { $search: search };
    }

    const items = await Item.find(query)
      .populate('owner', 'name hostel roomNo')
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
    console.error('Get items error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my-items', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const items = await Item.find({ 
      owner: req.user._id, 
      isActive: true 
    })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Item.countDocuments({ 
      owner: req.user._id, 
      isActive: true 
    });

    res.json({
      items,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get my items error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const item = await Item.findOne({ 
      _id: req.params.id, 
      isActive: true 
    }).populate('owner', 'name hostel roomNo email');

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ item });
  } catch (error) {
    console.error('Get item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', [
  authMiddleware,
  body('name').optional().trim().isLength({ min: 2 }).withMessage('Item name must be at least 2 characters'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('condition').optional().isIn(['New', 'Like New', 'Good', 'Fair', 'Poor']).withMessage('Please select a valid condition'),
  body('price').optional().isNumeric().withMessage('Price must be a number'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const item = await Item.findOne({ 
      _id: req.params.id, 
      owner: req.user._id,
      isActive: true 
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    const { name, description, condition, price, isAvailable } = req.body;

    if (name) item.name = name;
    if (description) item.description = description;
    if (condition) item.condition = condition;
    if (price !== undefined && item.transactionType === 'sell') item.price = price;
    if (isAvailable !== undefined) item.isAvailable = isAvailable;

    await item.save();
    await item.populate('owner', 'name hostel roomNo');

    res.json({
      message: 'Item updated successfully',
      item
    });
  } catch (error) {
    console.error('Update item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const item = await Item.findOne({ 
      _id: req.params.id, 
      owner: req.user._id 
    });

    if (!item) {
      return res.status(404).json({ error: 'Item not found or unauthorized' });
    }

    item.isActive = false;
    await item.save();

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/categories/stats', async (req, res) => {
  try {
    const stats = await Item.aggregate([
      { $match: { isActive: true, isAvailable: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ categoryStats: stats });
  } catch (error) {
    console.error('Category stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;