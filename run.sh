#!/bin/bash

# Exit on error
set -e

# Define colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Doctor Scheduling Application${NC}"
echo "--------------------------------------"

# Start Flask backend
echo -e "${YELLOW}Starting Flask backend...${NC}"
echo "Open a new terminal and run:"
echo -e "${GREEN}cd server && ./run.sh${NC}"
echo ""

# Start React frontend
echo -e "${YELLOW}Starting React frontend...${NC}"
echo "Open another terminal and run:"
echo -e "${GREEN}cd client && ./run.sh${NC}"
echo ""

echo -e "${YELLOW}Once both servers are running:${NC}"
echo "- Backend will be available at: http://localhost:5001"
echo "- Frontend will be available at: http://localhost:3000"
echo ""
echo -e "${GREEN}Happy scheduling!${NC}"
