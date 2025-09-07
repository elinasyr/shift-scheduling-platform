#!/bin/bash

# Exit on error
set -e

# Create a virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv venv
fi

# Activate the virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Create instance directory if it doesn't exist
mkdir -p instance

# Initialize the database if it doesn't exist
if [ ! -f "scheduling.sqlite" ]; then
  echo "Initializing database..."
  flask init-db
fi

# Run the server
echo "Starting Flask server..."
flask run --host=0.0.0.0 --port=5001
