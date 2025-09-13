// MongoDB initialization script for Thapar SwapShop
// This script creates the initial database structure and admin user

// Switch to the application database
db = db.getSiblingDB('thapar_swapshop');

// Create collections with validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'password', 'hostel', 'roomNo'],
      properties: {
        name: { bsonType: 'string', minLength: 2, maxLength: 100 },
        email: { bsonType: 'string', pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$' },
        password: { bsonType: 'string', minLength: 6 },
        hostel: { bsonType: 'string', enum: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'] },
        roomNo: { bsonType: 'string', minLength: 1 },
        role: { bsonType: 'string', enum: ['user', 'admin'] },
        isActive: { bsonType: 'bool' },
        rewardPoints: { bsonType: 'number', minimum: 0 }
      }
    }
  }
});

db.createCollection('items', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'description', 'category', 'transactionType', 'owner'],
      properties: {
        title: { bsonType: 'string', minLength: 3, maxLength: 100 },
        description: { bsonType: 'string', minLength: 10, maxLength: 1000 },
        category: { bsonType: 'string', enum: ['Electronics', 'Books', 'Medicines', 'Toiletries', 'Eatables'] },
        transactionType: { bsonType: 'string', enum: ['lend', 'sell'] },
        condition: { bsonType: 'string', enum: ['New', 'Like New', 'Good', 'Fair', 'Poor'] },
        price: { bsonType: 'number', minimum: 0 },
        isAvailable: { bsonType: 'bool' }
      }
    }
  }
});

db.createCollection('requests', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['title', 'description', 'category', 'requester'],
      properties: {
        title: { bsonType: 'string', minLength: 3, maxLength: 100 },
        description: { bsonType: 'string', minLength: 10, maxLength: 1000 },
        category: { bsonType: 'string', enum: ['Electronics', 'Books', 'Medicines', 'Toiletries', 'Eatables'] },
        status: { bsonType: 'string', enum: ['active', 'fulfilled', 'closed'] }
      }
    }
  }
});

db.createCollection('transactions');
db.createCollection('trustscores');
db.createCollection('wishlists');
db.createCollection('reports');

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ hostel: 1, roomNo: 1 });
db.items.createIndex({ category: 1, transactionType: 1 });
db.items.createIndex({ owner: 1 });
db.items.createIndex({ isAvailable: 1 });
db.requests.createIndex({ category: 1, status: 1 });
db.requests.createIndex({ requester: 1 });
db.transactions.createIndex({ borrower: 1, lender: 1 });
db.trustscores.createIndex({ user: 1 }, { unique: true });
db.wishlists.createIndex({ user: 1, item: 1 });

// Create default admin user (password: admin123)
// Note: In production, change this password immediately
db.users.insertOne({
  name: 'System Administrator',
  email: 'admin@thapar.edu',
  password: '$2b$10$8K1p/a0dF6d9lGzJ0oZm9u0JnrG5VGp7jh3rZ8tKx4bQ6cW7E8s2a', // admin123
  hostel: 'A',
  roomNo: '000',
  role: 'admin',
  isActive: true,
  rewardPoints: 0,
  trustScore: 850,
  starRating: 5,
  trustLevel: 'Excellent',
  totalTransactions: 0,
  lastTrustScoreUpdate: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
});

// Initialize trust score for admin
db.trustscores.insertOne({
  user: db.users.findOne({ email: 'admin@thapar.edu' })._id,
  currentScore: 850,
  starRating: 5,
  trustLevel: 'Excellent',
  totalTransactions: 0,
  positiveTransactions: 0,
  negativeTransactions: 0,
  transactions: [],
  lastActivityAt: new Date(),
  monthsInactive: 0,
  isFirstTransaction: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

print('Database initialized successfully with collections, indexes, and admin user');
print('Default admin credentials: admin@thapar.edu / admin123');
print('IMPORTANT: Change the admin password in production!');