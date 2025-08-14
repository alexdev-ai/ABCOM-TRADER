#!/bin/bash

# Production Deployment Script for SmartTrade AI (forkcast.net)
# This script deploys both backend (Railway) and frontend (Vercel)

set -e

echo "🚀 Starting SmartTrade AI Production Deployment"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking required dependencies..."
    
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is not installed. Please install it first:"
        echo "npm install -g @railway/cli"
        exit 1
    fi
    
    if ! command -v vercel &> /dev/null; then
        print_error "Vercel CLI is not installed. Please install it first:"
        echo "npm install -g vercel"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Deploy backend to Railway
deploy_backend() {
    print_status "Deploying backend to Railway..."
    
    # Check if logged in to Railway
    if ! railway whoami &> /dev/null; then
        print_error "Not logged in to Railway. Please run: railway login"
        exit 1
    fi
    
    # Build backend
    print_status "Building backend..."
    cd backend
    npm ci --only=production
    npm run build
    cd ..
    
    # Deploy to Railway
    print_status "Deploying to Railway..."
    railway up --detach
    
    # Run database migrations
    print_status "Running database migrations..."
    railway run npx prisma migrate deploy
    
    print_success "Backend deployed to Railway"
}

# Deploy frontend to Vercel
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    
    # Check if logged in to Vercel
    if ! vercel whoami &> /dev/null; then
        print_error "Not logged in to Vercel. Please run: vercel login"
        exit 1
    fi
    
    # Build and deploy frontend
    print_status "Building and deploying frontend..."
    cd frontend
    npm ci
    npm run build
    cd ..
    
    # Deploy to Vercel
    vercel --prod --yes
    
    print_success "Frontend deployed to Vercel"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Check backend health
    print_status "Checking backend health..."
    if curl -f -s "https://api.forkcast.net/api/v1/health" > /dev/null; then
        print_success "Backend health check passed"
    else
        print_warning "Backend health check failed - please verify manually"
    fi
    
    # Check frontend
    print_status "Checking frontend..."
    if curl -f -s "https://forkcast.net" > /dev/null; then
        print_success "Frontend health check passed"
    else
        print_warning "Frontend health check failed - please verify manually"
    fi
}

# Set production environment variables
set_environment_variables() {
    print_status "Setting environment variables..."
    
    print_warning "Please ensure the following environment variables are set in Railway:"
    echo "- NODE_ENV=production"
    echo "- JWT_SECRET=<your-secure-jwt-secret>"
    echo "- ALPACA_API_KEY=<your-alpaca-key>"
    echo "- ALPACA_SECRET_KEY=<your-alpaca-secret>"
    echo "- FRONTEND_URL=https://forkcast.net"
    echo "- CORS_ORIGINS=https://forkcast.net,https://www.forkcast.net"
    
    print_warning "Please ensure the following environment variables are set in Vercel:"
    echo "- VITE_API_URL=https://api.forkcast.net"
    echo "- VITE_WS_URL=wss://api.forkcast.net"
    echo "- VITE_APP_NAME=SmartTrade AI"
    
    read -p "Have you set all environment variables? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please set environment variables before continuing"
        exit 1
    fi
}

# Domain configuration reminder
domain_configuration() {
    print_status "Domain configuration reminder..."
    
    print_warning "Please ensure the following DNS records are configured:"
    echo "- forkcast.net → Vercel (frontend)"
    echo "- api.forkcast.net → Railway (backend)"
    
    print_warning "In Railway, add custom domain: api.forkcast.net"
    print_warning "In Vercel, add custom domain: forkcast.net"
    
    read -p "Have you configured all domains? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please configure domains before continuing"
        exit 1
    fi
}

# Main deployment flow
main() {
    echo "🎯 Target: Production deployment to forkcast.net"
    echo "📦 Backend: Railway (api.forkcast.net)"
    echo "🌐 Frontend: Vercel (forkcast.net)"
    echo ""
    
    read -p "Continue with production deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
    
    check_dependencies
    set_environment_variables
    domain_configuration
    
    deploy_backend
    deploy_frontend
    health_check
    
    print_success "🎉 Production deployment completed successfully!"
    echo ""
    echo "📱 Frontend: https://forkcast.net"
    echo "🔧 Backend API: https://api.forkcast.net"
    echo "🏥 Health Check: https://api.forkcast.net/api/v1/health"
    echo ""
    print_warning "Please verify the deployment manually and monitor for any issues."
}

# Run main function
main "$@"
