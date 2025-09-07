#!/bin/bash

# Path to the SQLite database file
DB_FILE="scheduling.sqlite"

# Check if the database file exists
if [ ! -f "$DB_FILE" ]; then
  echo "Error: Database file $DB_FILE not found!"
  exit 1
fi

# Function to display help message
show_help() {
  echo "SQLite Database Viewer"
  echo "Usage: $0 [command]"
  echo ""
  echo "Commands:"
  echo "  tables          - List all tables in the database"
  echo "  doctors         - Show content of doctors table"
  echo "  hospitals       - Show content of hospitals table"
  echo "  shifts          - Show content of shifts table"
  echo "  availabilities  - Show content of availabilities table"
  echo "  holidays        - Show content of holidays table"
  echo "  schema [table]  - Show schema for a specific table"
  echo ""
  echo "Example: $0 doctors"
}

# Run SQLite command and handle error
run_sqlite_command() {
  sqlite3 "$DB_FILE" "$1" || echo "Error executing SQLite command"
}

# Main logic based on command
case "$1" in
  "tables")
    echo "=== Database Tables ==="
    run_sqlite_command ".tables"
    ;;
    
  "doctors")
    echo "=== Doctors Table ==="
    run_sqlite_command "SELECT * FROM doctors;"
    ;;
    
  "hospitals")
    echo "=== Hospitals Table ==="
    run_sqlite_command "SELECT * FROM hospitals;"
    ;;
    
  "shifts")
    echo "=== Shifts Table ==="
    run_sqlite_command "SELECT * FROM shifts;"
    ;;
    
  "availabilities")
    echo "=== Availabilities Table ==="
    run_sqlite_command "SELECT * FROM availabilities;"
    ;;
    
  "holidays")
    echo "=== Holidays Table ==="
    run_sqlite_command "SELECT * FROM holidays;"
    ;;
    
  "schema")
    if [ -z "$2" ]; then
      echo "=== Full Database Schema ==="
      run_sqlite_command ".schema"
    else
      echo "=== Schema for $2 Table ==="
      run_sqlite_command ".schema $2"
    fi
    ;;
    
  *)
    show_help
    ;;
esac
