#!/bin/bash

# Install npm dependencies
npm install

# Build the React application
npm run build

# Install serve globally to serve the built app
npm install -g serve

# Serve the built application
serve -s build -l 3000