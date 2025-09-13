const express = require('express');
const { body, validationResult } = require('express-validator');
const Request = require('../models/Request');
const Item = require('../models/Item');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.post('/', [
  authMiddleware,
  body('title').trim().isLength({ min: 2 }).withMessage('Title must be at least 2 characters'),
  body('description').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category').isIn(['Electronics', 'Books', 'Medicines', 'Toiletries', 'Eatables']).withMessage('Please select a valid category'),
  body('transactionType').isIn(['buy', 'borrow']).withMessage('Please select a valid transaction type'),
  body('maxPrice').optional().isNumeric().withMessage('Max price must be a number'),
  body('urgency').optional().isIn(['low', 'medium', 'high']).withMessage('Please select a valid urgency level')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, transactionType, maxPrice, urgency } = req.body;

    if (transactionType === 'buy' && !maxPrice) {
      return res.status(400).json({ error: 'Max price is required for buy requests' });
    }

    const request = new Request({
      title,
      description,
      category,
      transactionType,
      maxPrice: transactionType === 'buy' ? maxPrice : undefined,
      urgency: urgency || 'medium',
      requester: req.user._id,
      hostel: req.user.hostel
    });

    await request.save();
    await request.populate('requester', 'name hostel roomNo');

    res.status(201).json({
      message: 'Request created successfully',
      request
    });
  } catch (error) {
    console.error('Create request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      hostel, 
      transactionType, 
      urgency,
      status = 'active',
      search
    } = req.query;

    const query = { isActive: true, status };

    if (category) query.category = category;
    if (hostel) query.hostel = hostel;
    if (transactionType) query.transactionType = transactionType;
    if (urgency) query.urgency = urgency;

    if (search) {
      query.$text = { $search: search };
    }

    const requests = await Request.find(query)
      .populate('requester', 'name hostel roomNo')
      .populate('responses.user', 'name hostel roomNo')
      .populate('responses.item', 'name images condition')
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
    console.error('Get requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/my-requests', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { 
      requester: req.user._id, 
      isActive: true 
    };

    if (status) query.status = status;

    const requests = await Request.find(query)
      .populate('responses.user', 'name hostel roomNo')
      .populate('responses.item', 'name images condition')
      .sort({ createdAt: -1 })
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
    console.error('Get my requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/respond', [
  authMiddleware,
  body('itemId').optional().isMongoId().withMessage('Invalid item ID'),
  body('message').trim().isLength({ min: 5 }).withMessage('Message must be at least 5 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const request = await Request.findOne({ 
      _id: req.params.id, 
      status: 'active',
      isActive: true 
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or not active' });
    }

    if (request.requester.toString() === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot respond to your own request' });
    }

    const { itemId, message } = req.body;
    let item = null;

    if (itemId) {
      item = await Item.findOne({
        _id: itemId,
        owner: req.user._id,
        isActive: true,
        isAvailable: true
      });

      if (!item) {
        return res.status(404).json({ error: 'Item not found or not available' });
      }

      if (request.transactionType === 'buy' && item.transactionType !== 'sell') {
        return res.status(400).json({ error: 'Item is not for sale' });
      }

      if (request.transactionType === 'borrow' && item.transactionType !== 'lend') {
        return res.status(400).json({ error: 'Item is not for lending' });
      }
    }

    const existingResponse = request.responses.find(
      response => response.user.toString() === req.user._id.toString()
    );

    if (existingResponse) {
      return res.status(400).json({ error: 'You have already responded to this request' });
    }

    request.responses.push({
      user: req.user._id,
      item: item?._id,
      message
    });

    await request.save();
    await request.populate('responses.user', 'name hostel roomNo');
    await request.populate('responses.item', 'name images condition');

    res.status(201).json({
      message: 'Response added successfully',
      request
    });
  } catch (error) {
    console.error('Respond to request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/status', [
  authMiddleware,
  body('status').isIn(['fulfilled', 'closed']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const request = await Request.findOne({ 
      _id: req.params.id, 
      requester: req.user._id,
      isActive: true 
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    request.status = req.body.status;
    await request.save();

    res.json({
      message: 'Request status updated successfully',
      request
    });
  } catch (error) {
    console.error('Update request status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const request = await Request.findOne({ 
      _id: req.params.id, 
      requester: req.user._id 
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or unauthorized' });
    }

    request.isActive = false;
    await request.save();

    res.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Delete request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;