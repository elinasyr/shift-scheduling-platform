# Use Python 3.11 slim image for better compatibility with ortools
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create instance directory for SQLite (if needed for local development)
RUN mkdir -p instance

# Expose port (Railway will override this with PORT env var)
EXPOSE 5001

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONPATH=/app

# Command to run the application
CMD gunicorn --bind 0.0.0.0:$PORT --workers 1 --timeout 120 app:app