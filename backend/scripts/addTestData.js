const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Item = require('../models/Item');

const addTestData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - remove if you want to keep existing data)
    await User.deleteMany({});
    await Item.deleteMany({});
    console.log('Cleared existing data');

    // Create test users
    const testUsers = [
      {
        name: 'John Doe',
        email: 'john@thapar.edu',
        password: await bcrypt.hash('password123', 12),
        hostel: 'A',
        roomNo: '101',
        role: 'user'
      },
      {
        name: 'Jane Smith',
        email: 'jane@thapar.edu', 
        password: await bcrypt.hash('password123', 12),
        hostel: 'B',
        roomNo: '205',
        role: 'user'
      },
      {
        name: 'Admin User',
        email: 'admin@thapar.edu',
        password: await bcrypt.hash('admin123', 12),
        hostel: 'A',
        roomNo: '301',
        role: 'admin'
      },
      {
        name: 'Test User',
        email: 'test@thapar.edu',
        password: await bcrypt.hash('test123', 12),
        hostel: 'C',
        roomNo: '150',
        role: 'user'
      }
    ];

    const createdUsers = await User.insertMany(testUsers);
    console.log('Created test users');

    // Create test items with variety from different users
    const testItems = [
      // John Doe's items (createdUsers[0])
      {
        name: 'iPhone 13',
        description: 'Barely used iPhone 13 with 128GB storage. Excellent condition with original box and charger.',
        category: 'Electronics',
        condition: 'Like New',
        transactionType: 'sell',
        price: 45000,
        owner: createdUsers[0]._id,
        hostel: 'A',
        images: ['https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=400&h=400&fit=crop']
      },
      {
        name: 'Gaming Laptop',
        description: 'High-performance gaming laptop with RTX 3060, 16GB RAM, and 512GB SSD. Great for gaming and programming.',
        category: 'Electronics',
        condition: 'Good',
        transactionType: 'sell',
        price: 75000,
        owner: createdUsers[0]._id,
        hostel: 'A',
        images: ['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop']
      },
      {
        name: 'Programming Books Set',
        description: 'Collection of programming books including Java, Python, and Data Structures. Great for CS students.',
        category: 'Books',
        condition: 'Good',
        transactionType: 'lend',
        owner: createdUsers[0]._id,
        hostel: 'A',
        images: ['https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400&h=400&fit=crop']
      },
      {
        name: 'Wireless Earbuds',
        description: 'Apple AirPods Pro with noise cancellation. Excellent sound quality and battery life.',
        category: 'Electronics',
        condition: 'Like New',
        transactionType: 'sell',
        price: 18000,
        owner: createdUsers[0]._id,
        hostel: 'A',
        images: ['https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=400&h=400&fit=crop']
      },

      // Jane Smith's items (createdUsers[1])
      {
        name: 'Operating Systems Textbook',
        description: 'Comprehensive textbook on Operating Systems by Galvin. Perfect for computer science students.',
        category: 'Books',
        condition: 'Good',
        transactionType: 'lend',
        owner: createdUsers[1]._id,
        hostel: 'B',
        images: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop']
      },
      {
        name: 'Shampoo & Conditioner Set',
        description: 'L\'Oreal shampoo and conditioner set, half used. Good for dry and damaged hair treatment.',
        category: 'Toiletries',
        condition: 'Fair',
        transactionType: 'sell',
        price: 300,
        owner: createdUsers[1]._id,
        hostel: 'B',
        images: ['https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=400&fit=crop']
      },
      {
        name: 'Mathematics Textbook',
        description: 'Engineering Mathematics by B.S. Grewal. Essential for first and second year engineering students.',
        category: 'Books',
        condition: 'Good',
        transactionType: 'lend',
        owner: createdUsers[1]._id,
        hostel: 'B',
        images: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&h=400&fit=crop']
      },
      {
        name: 'Face Wash',
        description: 'Himalaya face wash for oily skin. Almost new, used only few times.',
        category: 'Toiletries',
        condition: 'Like New',
        transactionType: 'sell',
        price: 80,
        owner: createdUsers[1]._id,
        hostel: 'B',
        images: ['https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop']
      },
      {
        name: 'Snacks Combo',
        description: 'Mixed snacks including chips, cookies, and chocolates. Perfect for movie nights.',
        category: 'Eatables',
        condition: 'New',
        transactionType: 'sell',
        price: 250,
        owner: createdUsers[1]._id,
        hostel: 'B',
        images: ['https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=400&h=400&fit=crop']
      },

      // Admin User's items (createdUsers[2])
      {
        name: 'Maggi Noodles Pack',
        description: 'Pack of 12 Maggi noodles, different flavors. Perfect for late-night study sessions.',
        category: 'Eatables',
        condition: 'New',
        transactionType: 'sell',
        price: 180,
        owner: createdUsers[2]._id,
        hostel: 'A',
        images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop']
      },
      {
        name: 'Scientific Calculator',
        description: 'Casio FX-991EX scientific calculator. Essential for engineering calculations.',
        category: 'Electronics',
        condition: 'Good',
        transactionType: 'lend',
        owner: createdUsers[2]._id,
        hostel: 'A',
        images: ['https://images.unsplash.com/photo-1526367790999-0150786686a2?w=400&h=400&fit=crop']
      },
      {
        name: 'Instant Coffee',
        description: 'Nescafe instant coffee jar, barely used. Perfect for staying awake during exams.',
        category: 'Eatables',
        condition: 'Like New',
        transactionType: 'sell',
        price: 120,
        owner: createdUsers[2]._id,
        hostel: 'A',
        images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop']
      },

      // Test User's items (createdUsers[3])
      {
        name: 'Paracetamol Tablets',
        description: 'Pack of 10 paracetamol tablets for fever and headache relief. Unexpired and sealed.',
        category: 'Medicines',
        condition: 'New',
        transactionType: 'lend',
        owner: createdUsers[3]._id,
        hostel: 'C',
        images: ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=400&fit=crop']
      },
      {
        name: 'Study Table',
        description: 'Wooden study table with drawer. Perfect for hostel rooms. Slight wear but very functional.',
        category: 'Other',
        condition: 'Good',
        transactionType: 'sell',
        price: 2500,
        owner: createdUsers[3]._id,
        hostel: 'C',
        images: ['https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop']
      },
      {
        name: 'Cough Syrup',
        description: 'Benadryl cough syrup for dry cough. Half bottle remaining, not expired.',
        category: 'Medicines',
        condition: 'Fair',
        transactionType: 'lend',
        owner: createdUsers[3]._id,
        hostel: 'C',
        images: ['https://images.unsplash.com/photo-1584433144859-1fc3ab64a957?w=400&h=400&fit=crop']
      },
      {
        name: 'Desk Lamp',
        description: 'LED desk lamp with adjustable brightness. Perfect for late night studying.',
        category: 'Other',
        condition: 'Good',
        transactionType: 'sell',
        price: 800,
        owner: createdUsers[3]._id,
        hostel: 'C',
        images: ['https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop']
      },
      {
        name: 'Energy Drinks Pack',
        description: 'Pack of 6 Red Bull energy drinks. Unopened and fresh. Great for exam preparation.',
        category: 'Eatables',
        condition: 'New',
        transactionType: 'sell',
        price: 600,
        owner: createdUsers[3]._id,
        hostel: 'C',
        images: ['https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&h=400&fit=crop']
      },
      {
        name: 'Toothbrush Set',
        description: 'Pack of 2 Oral-B toothbrushes with travel case. Brand new and unopened.',
        category: 'Toiletries',
        condition: 'New',
        transactionType: 'sell',
        price: 150,
        owner: createdUsers[3]._id,
        hostel: 'C',
        images: ['https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&h=400&fit=crop']
      },
      {
        name: 'Blanket',
        description: 'Warm winter blanket, good quality. Perfect for cold hostel nights. Freshly washed.',
        category: 'Other',
        condition: 'Good',
        transactionType: 'sell',
        price: 1200,
        owner: createdUsers[3]._id,
        hostel: 'C',
        images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop']
      }
    ];

    await Item.insertMany(testItems);
    console.log('Created test items');

    console.log('✅ Test data added successfully!');
    console.log('📧 Login credentials:');
    console.log('   User: test@thapar.edu / test123');
    console.log('   Admin: admin@thapar.edu / admin123');
    console.log('   Others: john@thapar.edu, jane@thapar.edu / password123');
    
  } catch (error) {
    console.error('Error adding test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

addTestData();