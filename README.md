# Thapar SwapShop 🏫

A comprehensive peer-to-peer trading platform designed specifically for Thapar Institute of Engineering & Technology students. Share, lend, sell, and request items within your hostel community with an advanced trust score system.

## 🌟 Features

### Core Features
- **Item Sharing**: Lend or sell items to fellow students
- **Smart Requests**: Request specific items from your community
- **Wishlist System**: Save items you're interested in
- **Transaction Management**: Track all your lending/borrowing activities

### Advanced Trust Score System
- **Dynamic Scoring**: 300-900 point range with 5-star rating system
- **Weighted Transactions**: Recent activities count double
- **Behavioral Tracking**: Rewards reliability, penalizes tardiness
- **Admin Controls**: Manual adjustments and penalty management
- **Automatic Penalties**: Inactivity and non-return detection

### Admin Dashboard
- **Live Statistics**: Real-time user and transaction monitoring
- **User Management**: Comprehensive user administration
- **Item Oversight**: Monitor all listed items and their status
- **Trust Score Management**: View, adjust, and manage user reputation
- **Reports System**: Generate insights on platform usage

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/thapar-swapshop.git
   cd thapar-swapshop
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Environment Variables

Create `.env` files in both backend and frontend directories:

**Backend (.env)**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/thapar_swapshop
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Frontend (.env)**
```env
REACT_APP_API_BASE_URL=http://localhost:5000
REACT_APP_ENVIRONMENT=development
```

## 📊 Trust Score System

### Scoring Algorithm
```
Trust Score = Base Score (650) + (Weighted Impact / Normalization Factor)
- Recent transactions (last 3): 2x weight
- Older transactions: 1x weight
- Score range: 300-900 points
```

### Point Values
| Action | Points | Description |
|--------|--------|-------------|
| Lender On-time Return | +80 | Successfully lent item, returned on time |
| Fulfilled Request | +60 | Helped another student with their request |
| Borrower On-time Return | +40 | Returned borrowed item on time |
| First Transaction | +30 | Welcome bonus for new users |
| Early Return | +20 | Returned item before due date |
| Non-return | -100 | Failed to return borrowed item |
| Admin Penalty | -70 | Manual penalty by administrator |
| Late Return | -50 | Returned item after due date |
| Unfair Cancellation | -40 | Cancelled transaction unfairly |
| Inactivity | -20 | Account inactive for extended period |

### Star Rating System
- ⭐⭐⭐⭐⭐ Excellent (820-900)
- ⭐⭐⭐⭐ Good (720-819)
- ⭐⭐⭐ Fair (600-719)
- ⭐⭐ Risky (450-599)
- ⭐ Very Poor (300-449)

## 🏗️ Architecture

### Backend Structure
```
backend/
├── models/          # Database schemas
├── routes/          # API endpoints
├── middleware/      # Authentication & validation
├── utils/           # Utility functions
├── config/          # Configuration files
└── server.js        # Application entry point
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/  # Reusable UI components
│   ├── pages/       # Page components
│   ├── context/     # React context providers
│   ├── utils/       # Utility functions
│   ├── types/       # TypeScript type definitions
│   └── App.tsx      # Application root
└── public/          # Static assets
```

### Key Technologies
- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React, TypeScript, TanStack Query, Tailwind CSS
- **Authentication**: JWT tokens
- **State Management**: React Context + TanStack Query
- **UI Framework**: Tailwind CSS with custom design system

## 🎨 Design System

### Color Palette
- **Primary**: Pastel Purple (#C5ADC5)
- **Secondary**: Light Steel Blue (#B2B5E0)
- **Accent**: Yellow for ratings and highlights
- **Neutrals**: Grays for text and backgrounds

### Components
- **Cards**: Consistent spacing and shadows
- **Buttons**: Multiple variants with hover effects
- **Forms**: Styled inputs with validation
- **Modals**: Centered overlays with backdrop
- **Navigation**: Clean tabbed interface

## 🔧 API Reference

### Authentication
```
POST /api/auth/signup    # Register new user
POST /api/auth/login     # User login
GET  /api/auth/me        # Get current user
```

### Items
```
GET    /api/items        # List items with filters
POST   /api/items        # Create new item
PUT    /api/items/:id    # Update item
DELETE /api/items/:id    # Delete item
```

### Trust Score
```
GET  /api/trustscore/me           # Get user's trust score
GET  /api/trustscore/leaderboard  # Top users
POST /api/trustscore/initialize   # Initialize score
```

### Admin
```
GET  /api/admin/dashboard         # Dashboard statistics
GET  /api/admin/users            # User management
POST /api/trustscore/admin/adjust # Manual score adjustment
```

## 🚀 Deployment

### Using Docker
```bash
# Build and run with Docker Compose
docker-compose up -d
```

### Manual Deployment
1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   npm install --production
   npm start
   ```

3. **Serve Frontend**
   - Use nginx or serve the `build` directory
   - Configure reverse proxy to backend

### Environment Setup
- Set `NODE_ENV=production`
- Configure MongoDB connection string
- Set up SSL certificates
- Configure CORS for your domain

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use consistent naming conventions
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes thoroughly

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- [ ] Mobile app development
- [ ] Push notifications
- [ ] Image upload for items
- [ ] Advanced filtering
- [ ] Chat system
- [ ] Payment integration
- [ ] QR code scanning
- [ ] Offline mode support

## 🎯 Project Goals

Created to foster a sharing economy within Thapar Institute, promoting sustainability, community building, and resource optimization among students.

---

**Made with ❤️ for Thapar Institute of Engineering & Technology**