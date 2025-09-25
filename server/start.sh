#!/bin/bash

# Install Python dependencies
pip install -r requirements.txt

# Use Gunicorn for production or Python for development
if [ "$FLASK_ENV" = "development" ]; then
    echo "Running in development mode with Flask dev server"
    python app.py
else
    echo "Running in production mode with Gunicorn"
    gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 app:app
fi