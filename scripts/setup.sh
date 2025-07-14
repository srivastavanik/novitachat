#!/bin/bash

# Nova Setup Script
# This script helps set up and run the Nova application

echo "🚀 Nova Setup Script"
echo "==================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ first.${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ npm is not installed. Please install npm first.${NC}"
    exit 1
fi

if ! command_exists docker; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met!${NC}"

# Setup backend
echo -e "\n${YELLOW}Setting up backend...${NC}"
cd backend

# Install dependencies
echo "Installing backend dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please update the .env file with your actual configuration${NC}"
fi

# Start Docker services
echo -e "\n${YELLOW}Starting Docker services (PostgreSQL and Redis)...${NC}"
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 5

# Run database setup
echo -e "\n${YELLOW}Setting up database...${NC}"
chmod +x scripts/setup-db.sh
./scripts/setup-db.sh

# Setup frontend
echo -e "\n${YELLOW}Setting up frontend...${NC}"
cd ../frontend

# Install dependencies
echo "Installing frontend dependencies..."
npm install

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "Creating .env.local file..."
    echo "NEXT_PUBLIC_API_URL=http://localhost:5000" > .env.local
fi

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "\n${YELLOW}To start the application:${NC}"
echo "1. Backend: cd backend && npm run dev"
echo "2. Frontend: cd frontend && npm run dev"
echo -e "\n${YELLOW}Access the application at:${NC}"
echo "- Frontend: http://localhost:3000"
echo "- Backend API: http://localhost:5000"
