#!/bin/bash

# Nova Development Runner
# This script runs both backend and frontend in development mode

echo "🚀 Starting Nova Development Environment"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to kill processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down Nova...${NC}"
    pkill -P $$
    exit 0
}

# Set up trap to catch CTRL+C
trap cleanup INT

# Check if services are running
echo -e "${YELLOW}Checking Docker services...${NC}"
if ! docker ps | grep -q nova-postgres; then
    echo -e "${RED}PostgreSQL is not running. Starting Docker services...${NC}"
    cd backend && docker-compose up -d && cd ..
    sleep 5
fi

if ! docker ps | grep -q nova-redis; then
    echo -e "${RED}Redis is not running. Starting Docker services...${NC}"
    cd backend && docker-compose up -d && cd ..
    sleep 5
fi

echo -e "${GREEN}✅ Docker services are running${NC}"

# Start backend
echo -e "\n${BLUE}Starting backend server...${NC}"
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "Waiting for backend to start..."
sleep 3

# Start frontend
echo -e "\n${BLUE}Starting frontend server...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "\n${GREEN}✅ Nova is running!${NC}"
echo -e "${YELLOW}================================${NC}"
echo -e "Frontend: ${BLUE}http://localhost:3000${NC}"
echo -e "Backend:  ${BLUE}http://localhost:5000${NC}"
echo -e "${YELLOW}================================${NC}"
echo -e "\nPress ${RED}CTRL+C${NC} to stop all services"

# Wait for processes
wait $BACKEND_PID $FRONTEND_PID
