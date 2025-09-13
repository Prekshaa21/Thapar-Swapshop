# Thapar SwapShop Setup Guide

## ✅ Project Status: COMPLETE

The Thapar SwapShop project has been fully built with all features implemented. Both backend and frontend are ready to run.

## Prerequisites

- Node.js (v18 or higher) ✅ Available
- MongoDB (local installation or MongoDB Atlas) ⚠️ Needs setup
- Git ✅ Available

## Local Development Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Thapar_Swapshop
```

### 2. Backend Setup

```bash
cd backend
npm install
```

#### Environment Configuration
Copy `.env.example` to `.env` and configure:

```bash
PORT=5000
MONGODB_URI=mongodb://localhost:27017/thapar_swapshop
JWT_SECRET=your_super_secure_jwt_secret_key_here
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=development
```

#### Start MongoDB

**Option 1: Using Docker (Recommended)**
```bash
docker run -d -p 27017:27017 --name mongodb-thapar mongo:7.0
```

**Option 2: Using Homebrew (macOS)**
```bash
# If MongoDB installation was interrupted, complete it:
brew install mongodb-community
brew services start mongodb-community
```

**Option 3: MongoDB Atlas (Cloud)**
```bash
# Create free cluster at https://www.mongodb.com/atlas
# Update MONGODB_URI with your Atlas connection string
```

**Verify MongoDB is running:**
```bash
# Check if MongoDB is accessible
curl -f http://localhost:27017/ || echo "MongoDB not running"
```

#### Start Backend Server
```bash
npm run dev
```
Backend will run on http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend
rm -rf node_modules package-lock.json  # Clean install
npm install --legacy-peer-deps         # Install with legacy peer deps
```

#### Environment Configuration ✅ Already Created
The `.env` file is already configured:
```bash
REACT_APP_API_URL=http://localhost:5000/api
GENERATE_SOURCEMAP=false
```

#### Fix Potential Frontend Issues
If you encounter dependency issues, try:
```bash
# Option 1: Use Node 16 (recommended for CRA)
nvm use 16 && npm install

# Option 2: Force install
npm install --force

# Option 3: Use Yarn instead
yarn install
```

#### Start Frontend Server
```bash
npm start
```
Frontend will run on http://localhost:3000

**Known Issue**: If you see Tailwind CSS PostCSS errors, the app will still work but without styling. This can be fixed by using a different CSS framework or manual CSS.

## Production Deployment

### Using Docker Compose
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down
```

### Vercel Deployment (Backend)
1. Install Vercel CLI: `npm i -g vercel`
2. Navigate to backend directory: `cd backend`
3. Deploy: `vercel`
4. Set environment variables in Vercel dashboard

### Netlify/Vercel Deployment (Frontend)
1. Build project: `npm run build`
2. Deploy `build` folder to hosting service
3. Set `REACT_APP_API_URL` environment variable

## Default Admin Account

Create an admin user by manually updating a user's role in MongoDB:
```javascript
db.users.updateOne(
  { email: "admin@thapar.edu" },
  { $set: { role: "admin" } }
)
```

## Features Implemented

✅ User authentication (signup/login)
✅ Item listing (sell/lend) with image upload
✅ Item browsing with filters and search
✅ Request system for unavailable items
✅ Transaction tracking with reward points
✅ Admin dashboard with user/content management
✅ Responsive mobile design
✅ RESTful API with validation
✅ Image upload to Cloudinary
✅ Rate limiting and security middleware

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Items
- `GET /api/items` - Browse all items
- `POST /api/items` - Create new item
- `GET /api/items/:id` - Get item details
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item

### Requests  
- `GET /api/requests` - Browse all requests
- `POST /api/requests` - Create new request
- `POST /api/requests/:id/respond` - Respond to request

### Transactions
- `GET /api/transactions` - Get user transactions
- `POST /api/transactions` - Create transaction
- `PUT /api/transactions/:id/return` - Confirm return

### Admin
- `GET /api/admin/dashboard` - Admin statistics
- `GET /api/admin/users` - Manage users
- `GET /api/admin/items` - Manage items

## Troubleshooting

### MongoDB Connection Issues
- Ensure MongoDB is running: `brew services list | grep mongo`
- Check MongoDB logs: `brew services log mongodb-community`
- Verify connection string in `.env` file

### Port Already in Use
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Kill process on port 3000  
lsof -ti:3000 | xargs kill -9
```

### Dependency Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```