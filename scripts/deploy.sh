#!/bin/bash

# Thapar SwapShop Deployment Script
# This script deploys the application using Docker Compose

set -e

echo "🚀 Starting Thapar SwapShop Deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Set environment variables
export NODE_ENV=${NODE_ENV:-production}
export MONGODB_URI=${MONGODB_URI:-mongodb://admin:password123@mongodb:27017/thapar_swapshop?authSource=admin}
export JWT_SECRET=${JWT_SECRET:-your_super_secret_jwt_key_change_this_in_production}
export CORS_ORIGIN=${CORS_ORIGIN:-http://localhost:3000}

echo "📋 Environment: $NODE_ENV"
echo "🔗 CORS Origin: $CORS_ORIGIN"

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down --remove-orphans

# Pull latest images
echo "📥 Pulling latest images..."
docker-compose pull

# Build and start services
echo "🔨 Building and starting services..."
docker-compose up -d --build

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check service status
echo "📊 Checking service status..."
docker-compose ps

# Test health endpoints
echo "🏥 Testing health endpoints..."
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Backend health check passed"
else
    echo "❌ Backend health check failed"
    exit 1
fi

if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend health check passed"
else
    echo "❌ Frontend health check failed"
    exit 1
fi

echo "🎉 Deployment completed successfully!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:5000"
echo "📊 API Health: http://localhost:5000/api/health"

# Show logs
echo "📝 Recent logs:"
docker-compose logs --tail=20