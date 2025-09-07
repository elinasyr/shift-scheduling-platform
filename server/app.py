from flask import Flask, jsonify, request
from flask_cors import CORS
from models import db, Doctor, Hospital, Shift, Availability, Holiday, RankEnum, CategoryEnum, AvailabilityEnum, HolidayType
from rules import RulesEngine
import os
from datetime import datetime, date, timedelta
from typing import Dict, List, Any

# Create and configure the application
app = Flask(__name__)
# Enable CORS with specific configuration
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}}, supports_credentials=True)

# Configure the SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'scheduling.sqlite')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database with the app
db.init_app(app)

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Server is running"})

# Doctor routes
@app.route('/api/doctors', methods=['GET'])
def get_doctors():
    """Get all doctors"""
    doctors = Doctor.query.all()
    result = []
    
    for doctor in doctors:
        result.append({
            "id": doctor.id,
            "firstName": doctor.first_name,
            "lastName": doctor.last_name,
            "email": doctor.email,
            "rank": doctor.rank.value,
            "category": doctor.category.value,
        })
    
    return jsonify(result)

@app.route('/api/doctors/<int:doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    """Get a specific doctor"""
    doctor = Doctor.query.get_or_404(doctor_id)
    
    return jsonify({
        "id": doctor.id,
        "firstName": doctor.first_name,
        "lastName": doctor.last_name,
        "email": doctor.email,
        "rank": doctor.rank.value,
        "category": doctor.category.value,
        "maturityLevel": doctor.maturity_level
    })

@app.route('/api/doctors', methods=['POST'])
def create_doctor():
    """Create a new doctor"""
    data = request.json
    
    try:
        new_doctor = Doctor(
            first_name=data['firstName'],
            last_name=data['lastName'],
            email=data['email'],
            rank=RankEnum(data['rank']),
            category=CategoryEnum(data['category']),
            maturity_level=data['maturityLevel']
        )
        
        db.session.add(new_doctor)
        db.session.commit()
        
        return jsonify({
            "id": new_doctor.id,
            "firstName": new_doctor.first_name,
            "lastName": new_doctor.last_name,
            "email": new_doctor.email,
            "rank": new_doctor.rank.value,
            "category": new_doctor.category.value,
            "maturityLevel": new_doctor.maturity_level
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

# Availability routes
@app.route('/api/availability/<int:doctor_id>', methods=['GET'])
def get_availability(doctor_id):
    """Get availability for a doctor"""
    # Validate that doctor exists
    doctor = Doctor.query.get_or_404(doctor_id)
    
    # Get query parameters
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    
    # Parse dates if provided
    if start_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
    else:
        # Default to first day of current month
        today = date.today()
        start_date = date(today.year, today.month, 1)
    
    if end_date_str:
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    else:
        # Default to last day of month
        import calendar
        today = date.today()
        _, last_day = calendar.monthrange(today.year, today.month)
        end_date = date(today.year, today.month, last_day)
    
    # Query availability
    availabilities = Availability.query.filter(
        Availability.doctor_id == doctor_id,
        Availability.date >= start_date,
        Availability.date <= end_date
    ).all()
    
    # Convert to dictionary with date as key
    result = {}
    for avail in availabilities:
        result[avail.date.isoformat()] = avail.status.value
    
    return jsonify({
        "doctorId": doctor_id,
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "availability": result
    })

@app.route('/api/availability/<int:doctor_id>', methods=['POST'])
def set_availability(doctor_id):
    """Set availability for a doctor on a specific date"""
    # Validate that doctor exists
    doctor = Doctor.query.get_or_404(doctor_id)
    
    data = request.json
    try:
        # Parse the date and status
        avail_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        status = AvailabilityEnum(data['status'])
        
        # Check if an availability record already exists for this date
        existing = Availability.query.filter_by(
            doctor_id=doctor_id,
            date=avail_date
        ).first()
        
        if existing:
            # Update existing record
            existing.status = status
            existing.updated_at = datetime.utcnow()
        else:
            # Create new record
            new_avail = Availability(
                doctor_id=doctor_id,
                date=avail_date,
                status=status
            )
            db.session.add(new_avail)
        
        db.session.commit()
        return jsonify({"success": True})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

# Shift routes
@app.route('/api/shifts', methods=['GET'])
def get_shifts():
    """Get all shifts with optional filtering"""
    # Get query parameters
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    doctor_id = request.args.get('doctorId')
    hospital_id = request.args.get('hospitalId')
    
    # Build the query
    query = Shift.query
    
    # Apply filters
    if start_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        query = query.filter(Shift.date >= start_date)
    
    if end_date_str:
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        query = query.filter(Shift.date <= end_date)
    
    if doctor_id:
        query = query.filter(Shift.doctor_id == int(doctor_id))
    
    if hospital_id:
        query = query.filter(Shift.hospital_id == int(hospital_id))
    
    # Execute query
    shifts = query.all()
    
    # Format results
    result = []
    for shift in shifts:
        doctor = Doctor.query.get(shift.doctor_id)
        hospital = Hospital.query.get(shift.hospital_id)
        
        result.append({
            "id": shift.id,
            "date": shift.date.isoformat(),
            "doctor": {
                "id": doctor.id,
                "name": f"{doctor.first_name} {doctor.last_name}",
                "rank": doctor.rank.value
            },
            "hospital": {
                "id": hospital.id,
                "name": hospital.name
            },
            "isOverride": shift.is_override
        })
    
    return jsonify(result)

@app.route('/api/shifts', methods=['POST'])
def create_shift():
    """Create a new shift assignment"""
    data = request.json
    
    try:
        # Parse the date
        shift_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        doctor_id = data['doctorId']
        hospital_id = data['hospitalId']
        is_override = data.get('isOverride', False)
        
        # Validate doctor and hospital exist
        doctor = Doctor.query.get_or_404(doctor_id)
        hospital = Hospital.query.get_or_404(hospital_id)
        
        # If not an override, check against scheduling rules
        if not is_override:
            rules_engine = RulesEngine(hospital_id=hospital_id)
            violations = rules_engine.validate_shift_assignment(doctor_id, shift_date)
            
            if violations:
                return jsonify({
                    "success": False,
                    "violations": [{"rule": v.rule_name, "description": v.description, "severity": v.severity} for v in violations]
                }), 400
        
        # Check if a shift already exists for this doctor and date
        existing = Shift.query.filter_by(
            doctor_id=doctor_id,
            date=shift_date
        ).first()
        
        if existing:
            return jsonify({
                "success": False,
                "error": "Doctor already has a shift scheduled on this date."
            }), 400
        
        # Create the new shift
        new_shift = Shift(
            date=shift_date,
            doctor_id=doctor_id,
            hospital_id=hospital_id,
            is_override=is_override
        )
        
        db.session.add(new_shift)
        db.session.commit()
        
        return jsonify({
            "id": new_shift.id,
            "date": new_shift.date.isoformat(),
            "doctorId": new_shift.doctor_id,
            "hospitalId": new_shift.hospital_id,
            "isOverride": new_shift.is_override
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/shifts/<int:shift_id>', methods=['DELETE'])
def delete_shift(shift_id):
    """Delete a shift assignment"""
    shift = Shift.query.get_or_404(shift_id)
    
    try:
        db.session.delete(shift)
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/shifts/clear', methods=['DELETE'])
def clear_all_shifts():
    """Delete all shifts for a given month/year/hospital"""
    try:
        # Get query parameters
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        hospital_id = request.args.get('hospitalId', type=int)
        
        # Build the query
        query = Shift.query
        
        # If year and month provided, filter by date range
        if year and month:
            start_date = date(year, month, 1)
            if month == 12:
                end_date = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_date = date(year, month + 1, 1) - timedelta(days=1)
                
            query = query.filter(Shift.date >= start_date, Shift.date <= end_date)
        
        # If hospital_id provided, filter by hospital
        if hospital_id:
            query = query.filter(Shift.hospital_id == hospital_id)
        
        # Count shifts before deletion for response
        shift_count = query.count()
        
        # Delete matching shifts
        query.delete()
        db.session.commit()
        
        return jsonify({
            "success": True,
            "deleted_count": shift_count
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

# Holiday routes
@app.route('/api/holidays', methods=['GET'])
def get_holidays():
    """Get all holidays with optional date range filtering"""
    # Get query parameters
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    
    # Build the query
    query = Holiday.query
    
    # Apply filters
    if start_date_str:
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        query = query.filter(Holiday.date >= start_date)
    
    if end_date_str:
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        query = query.filter(Holiday.date <= end_date)
    
    # Execute query
    holidays = query.all()
    
    # Format results
    result = []
    for holiday in holidays:
        result.append({
            "id": holiday.id,
            "date": holiday.date.isoformat(),
            "name": holiday.name,
            "type": holiday.type.value,
            "description": holiday.description
        })
    
    return jsonify(result)

# Schedule generation endpoints
@app.route('/api/schedule/generate', methods=['POST'])
def generate_schedule():
    """Generate a schedule for a specific month"""
    data = request.json
    
    try:
        year = data.get('year', date.today().year)
        month = data.get('month', date.today().month)
        hospital_id = data.get('hospitalId', 1)  # Default to Attikon hospital
        
        # Generate the schedule
        rules_engine = RulesEngine(hospital_id=hospital_id)
        result = rules_engine.generate_monthly_schedule(year, month)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/schedule/validate', methods=['GET'])
def validate_schedule():
    """Validate the current schedule against all rules"""
    try:
        # Get query parameters
        year = request.args.get('year', date.today().year, type=int)
        month = request.args.get('month', date.today().month, type=int)
        hospital_id = request.args.get('hospitalId', 1, type=int)  # Default to Attikon hospital
        
        # Validate the schedule
        rules_engine = RulesEngine(hospital_id=hospital_id)
        violations = rules_engine.validate_overall_schedule(year, month)
        
        # Format results
        result = {
            "valid": len(violations) == 0,
            "violations": [{"rule": v.rule_name, "description": v.description, "severity": v.severity} for v in violations]
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 400

# Database initialization and command
@app.cli.command('init-db')
def init_db_command():
    """Create the database tables and initial data"""
    with app.app_context():
        # Create all tables
        db.create_all()
        
        # Check if we already have data
        if Hospital.query.count() > 0:
            print('Database already initialized.')
            return
        
        # Add Attikon hospital
        attikon = Hospital(name="Attikon Hospital", location="Athens, Greece")
        db.session.add(attikon)
        
        # Add some sample doctors
        doctors = [
            Doctor(first_name="John", last_name="Doe", email="john.doe@hospital.com", 
                  rank=RankEnum.INTERN, category=CategoryEnum.JUNIOR, maturity_level=1),
            Doctor(first_name="Jane", last_name="Smith", email="jane.smith@hospital.com", 
                  rank=RankEnum.RESIDENT, category=CategoryEnum.SENIOR, maturity_level=3),
            Doctor(first_name="Michael", last_name="Johnson", email="michael.johnson@hospital.com", 
                  rank=RankEnum.ATTENDING, category=CategoryEnum.SENIOR, maturity_level=5)
        ]
        for doctor in doctors:
            db.session.add(doctor)
        
        # Add some holidays
        holidays = [
            Holiday(date=date(2025, 1, 1), name="New Year's Day", type=HolidayType.NATIONAL),
            Holiday(date=date(2025, 1, 6), name="Epiphany", type=HolidayType.RELIGIOUS),
            Holiday(date=date(2025, 3, 25), name="Greek Independence Day", type=HolidayType.NATIONAL),
            Holiday(date=date(2025, 5, 1), name="Labor Day", type=HolidayType.NATIONAL)
        ]
        for holiday in holidays:
            db.session.add(holiday)
        
        # Commit the changes
        db.session.commit()
        print('Database initialized with sample data.')

# Run the app
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
