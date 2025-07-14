#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Nova Backend Database Setup${NC}"
echo "=============================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Start PostgreSQL and Redis with Docker Compose
echo -e "${YELLOW}Starting PostgreSQL and Redis...${NC}"
docker-compose up -d postgres redis

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
sleep 5

# Check if database is ready
until docker exec nova-postgres pg_isready -U postgres > /dev/null 2>&1; do
    echo "Waiting for PostgreSQL to start..."
    sleep 1
done

echo -e "${GREEN}PostgreSQL is ready!${NC}"

# Check if Redis is ready
until docker exec nova-redis redis-cli -a redis_password ping > /dev/null 2>&1; do
    echo "Waiting for Redis to start..."
    sleep 1
done

echo -e "${GREEN}Redis is ready!${NC}"

# Create database if it doesn't exist
echo -e "${YELLOW}Creating database...${NC}"
docker exec nova-postgres psql -U postgres -tc "SELECT 1 FROM pg_database WHERE datname = 'nova_db'" | grep -q 1 || docker exec nova-postgres psql -U postgres -c "CREATE DATABASE nova_db"

# Run schema
echo -e "${YELLOW}Running database schema...${NC}"
docker exec -i nova-postgres psql -U postgres -d nova_db < src/database/schema.sql

echo -e "${GREEN}Database setup complete!${NC}"
echo ""
echo "Services running:"
echo "- PostgreSQL: localhost:5432"
echo "- Redis: localhost:6379"
echo "- Adminer (DB UI): http://localhost:8080"
echo ""
echo "To start all services (including Adminer):"
echo "  docker-compose up -d"
echo ""
echo "To stop all services:"
echo "  docker-compose down"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f"
