# Thapar SwapShop - Deployment Guide

## 🚀 Production-Ready Features

✅ **Complete Trust Score System**
- Dynamic scoring algorithm (300-900 points)
- 5-star rating system with behavioral tracking
- Recent transaction weighting (2x for last 3 transactions)
- Comprehensive admin management interface

✅ **Security & Performance**
- Enhanced security headers with Helmet.js
- Rate limiting (100 req/15min general, 5 req/15min for auth)
- CORS configuration with multiple origins support
- Content Security Policy implementation
- Non-root Docker containers for security

✅ **Development & Deployment**
- Docker containerization with health checks
- Docker Compose for multi-service deployment
- Environment variable configuration
- Automated deployment scripts
- Database initialization scripts

✅ **Documentation & Code Quality**
- Comprehensive API documentation
- Setup instructions and development guide
- ESLint warnings resolved
- Clean project structure
- MIT License included

## 📁 Project Structure

```
Thapar_SwapShop/
├── README.md                    # Main project documentation
├── API.md                      # Complete API documentation
├── LICENSE                     # MIT License
├── DEPLOYMENT.md              # This deployment guide
├── .gitignore                 # Git ignore rules
├── docker-compose.yml         # Multi-service Docker setup
│
├── backend/                   # Node.js API Server
│   ├── models/               # MongoDB schemas
│   ├── routes/               # API endpoints
│   ├── middleware/           # Auth & validation
│   ├── utils/                # Utility functions
│   ├── server.js             # Application entry point
│   ├── package.json          # Dependencies
│   ├── Dockerfile            # Docker configuration
│   ├── .env.example          # Environment template
│   └── .dockerignore         # Docker ignore rules
│
├── frontend/                 # React TypeScript App
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── context/          # React context providers
│   │   ├── utils/            # Utility functions
│   │   ├── types/            # TypeScript definitions
│   │   └── App.tsx           # Application root
│   ├── public/               # Static assets
│   ├── package.json          # Dependencies
│   ├── Dockerfile            # Docker configuration
│   ├── .env.example          # Environment template
│   └── .dockerignore         # Docker ignore rules
│
└── scripts/                  # Deployment & Setup Scripts
    ├── deploy.sh             # Production deployment
    ├── setup-dev.sh          # Development setup
    └── mongo-init.js         # Database initialization
```

## 🚀 Quick Deployment

### Option 1: Docker Compose (Recommended)
```bash
# Clone the repository
git clone <your-repo-url>
cd thapar-swapshop

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit environment variables as needed
nano backend/.env
nano frontend/.env

# Deploy with Docker
./scripts/deploy.sh
```

### Option 2: Manual Deployment
```bash
# Setup development environment
./scripts/setup-dev.sh

# Start backend
cd backend && npm start

# Start frontend (in new terminal)
cd frontend && npm start
```

## 🔧 Environment Configuration

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb://localhost:27017/thapar_swapshop
JWT_SECRET=your_secure_jwt_secret_here
CORS_ORIGIN=https://your-frontend-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend (.env)
```env
REACT_APP_API_BASE_URL=https://your-api-domain.com
REACT_APP_ENVIRONMENT=production
REACT_APP_ENABLE_DEBUG=false
REACT_APP_ENABLE_ANALYTICS=true
```

## 🏗️ Hosting Options

### Option 1: Cloud Platforms
- **Frontend**: Vercel, Netlify, or AWS S3 + CloudFront
- **Backend**: Heroku, Railway, or AWS EC2
- **Database**: MongoDB Atlas

### Option 2: VPS Deployment
- **Server**: DigitalOcean, Linode, or AWS EC2
- **Reverse Proxy**: Nginx (included in docker-compose)
- **Database**: Self-hosted MongoDB

### Option 3: Container Platforms
- **Docker**: Any container hosting service
- **Kubernetes**: For scalable deployments
- **Docker Swarm**: For cluster deployments

## 🔐 Security Checklist

- [ ] Change default JWT secret
- [ ] Update admin password from default
- [ ] Configure proper CORS origins
- [ ] Set up SSL certificates
- [ ] Configure firewall rules
- [ ] Enable MongoDB authentication
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

## 📊 Monitoring & Maintenance

### Health Checks
- **Backend**: `GET /api/health`
- **Frontend**: `GET /` (returns React app)
- **Database**: Included in health endpoint

### Logs
```bash
# View application logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Database Management
```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh

# Backup database
mongodump --uri="mongodb://admin:password123@localhost:27017/thapar_swapshop?authSource=admin"

# Restore database
mongorestore --uri="mongodb://admin:password123@localhost:27017/thapar_swapshop?authSource=admin" dump/
```

## 🎯 Performance Optimization

### Frontend
- React build optimization enabled
- Compression enabled in Nginx
- Static asset caching
- Code splitting implemented

### Backend
- Response compression enabled
- Database indexing implemented
- Query optimization
- Rate limiting for performance

### Database
- Proper indexing on frequently queried fields
- Connection pooling
- Query optimization

## 🔄 Updates & Maintenance

### Updating the Application
```bash
# Pull latest changes
git pull origin main

# Rebuild and redeploy
docker-compose down
docker-compose up -d --build
```

### Database Migrations
```bash
# Run any new migration scripts
docker-compose exec backend node scripts/migrate.js
```

## 🆘 Troubleshooting

### Common Issues
1. **Port conflicts**: Ensure ports 3000, 5000, 27017 are available
2. **Environment variables**: Verify all required env vars are set
3. **Database connection**: Check MongoDB URI and credentials
4. **CORS errors**: Verify CORS_ORIGIN matches frontend URL
5. **Build failures**: Clear node_modules and reinstall

### Support
- Check logs with `docker-compose logs`
- Verify health endpoints
- Review environment configuration
- Check GitHub issues for known problems

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer for multiple backend instances
- Database read replicas
- CDN for static assets

### Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching strategies

---



Default admin credentials: `admin@thapar.edu` / `admin123`
**Remember to change these in production!**