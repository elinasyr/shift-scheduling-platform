# Doctor Scheduling Web Application

A web application for managing doctor shifts with automated scheduling and constraint management.

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: React with TypeScript
- **Database**: SQLite (with easy migration to PostgreSQL)

## Core Features

- Automated shift scheduling with configurable rules
- Preference-based scheduling that prioritizes doctor availability preferences
- Manager override capabilities
- Doctor availability management
- Calendar UI with availability visualization
- Role-based access control (Doctors vs. Managers)
- Holiday and celebration date highlighting

See [Preference-Based Scheduling](./docs/preference-based-scheduling.md) for details on how doctor preferences are used.

## Project Structure

```
scheduling/
├── server/             # Flask backend
│   ├── app.py          # Main application file
│   ├── models.py       # Database models
│   ├── rules.py        # Scheduling rules engine
│   └── routes/         # API endpoints
├── client/             # React frontend
│   ├── src/            # Source code
│   ├── public/         # Static files
│   └── package.json    # Dependencies
├── docs/               # Extended documentation
│   └── preference-based-scheduling.md  # Doctor preference system details
└── README.md           # Project documentation
```

## Setup Instructions

### Backend Setup

1. Navigate to the server directory
```
cd server
```

2. Create and activate a virtual environment
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies
```
pip install -r requirements.txt
```

4. Initialize the database
```
flask init-db
```

5. Run the development server
```
flask run
```

### Frontend Setup

1. Navigate to the client directory
```
cd client
```

2. Install dependencies
```
npm install
```

3. Run the development server
```
npm start
```
