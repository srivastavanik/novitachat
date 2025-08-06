#!/bin/bash

# Run database migration script
# This script runs SQL migrations against the Supabase database

# Check if migration file is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <migration_file>"
    echo "Example: $0 src/database/migrations/001_update_conversations_table.sql"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
else
  echo "Error: .env file not found"
  exit 1
fi

# Check if SUPABASE_DB_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "Error: SUPABASE_DB_URL is not set in .env file"
    exit 1
fi

# Check if migration file exists
if [ ! -f "$1" ]; then
    echo "Error: Migration file '$1' not found"
    exit 1
fi

# Run the migration
echo "Running migration: $1"
psql "$SUPABASE_DB_URL" -f "$1"

if [ $? -eq 0 ]; then
    echo "Migration completed successfully!"
else
    echo "Migration failed!"
    exit 1
fi
