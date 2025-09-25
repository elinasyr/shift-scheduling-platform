from flask import Flask, jsonify, request, g, make_response
from flask_cors import CORS
from models import (db, Doctor, Hospital, Shift, Availability, Holiday, HospitalDay, UserSession,
                   RankEnum, CategoryEnum, AvailabilityEnum, HolidayType, SpecializationEnum)
from rules_or import SchedulingSolver
import os
import secrets
import calendar
import traceback
from datetime import datetime, date, timedelta
from typing import Dict, List, Any
from functools import wraps

# Create and configure the application
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'

# Get the frontend URL from environment variables for CORS
frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
allowed_origins = [frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"]

# Enable CORS with production-ready configuration
CORS(app, resources={r"/api/*": {"origins": allowed_origins}}, supports_credentials=True)

# Configure database - use PostgreSQL in production, SQLite for development
database_url = os.environ.get('DATABASE_URL')
if database_url:
    # Railway provides PostgreSQL DATABASE_URL
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
else:
    # Fallback to SQLite for local development
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), 'scheduling.sqlite')

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize the database with the app
db.init_app(app)

# Authentication decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            
            # For now, we'll use a simple session-based approach
            session = UserSession.query.filter_by(token=token).first()
            if not session or session.expires_at < datetime.utcnow():
                return jsonify({'message': 'Token is invalid or expired'}), 401
            
            g.current_user = session.doctor
            
        except Exception as e:
            return jsonify({'message': 'Token is invalid'}), 401
        
        return f(*args, **kwargs)
    return decorated

# Optional authentication decorator (for endpoints that work with or without auth)
def optional_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        g.current_user = None
        
        if token:
            try:
                if token.startswith('Bearer '):
                    token = token[7:]
                
                session = UserSession.query.filter_by(token=token).first()
                if session and session.expires_at >= datetime.utcnow():
                    g.current_user = session.doctor
            except:
                pass
        
        return f(*args, **kwargs)
    return decorated

# Routes
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "ok", "message": "Server is running"})

# Authentication routes
@app.route('/api/auth/signup', methods=['POST'])
def signup():
    """Register a new user"""
    try:
        data = request.json
        
        # Validate required fields
        required_fields = ['firstName', 'lastName', 'username', 'email', 'password', 'role']
        for field in required_fields:
            if field not in data or not data[field]:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if username or email already exists
        if Doctor.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if Doctor.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new doctor
        doctor = Doctor(
            first_name=data['firstName'],
            last_name=data['lastName'],
            username=data['username'],
            email=data['email'],
            rank=RankEnum.RESIDENT,  # Default rank
            category=CategoryEnum.SENIOR if data['role'] == 'manager' else CategoryEnum.JUNIOR,
            specialization=SpecializationEnum.GENERAL  # Default specialization
        )
        
        if 'specialty' in data and data['specialty']:
            # Map specialty to specialization enum
            specialty_map = {
                'cardiology': SpecializationEnum.CARDIOLOGY,
                'thoracic': SpecializationEnum.THORACIC,
                'general': SpecializationEnum.GENERAL
            }
            doctor.specialization = specialty_map.get(data['specialty'].lower(), SpecializationEnum.GENERAL)
        
        if 'rank' in data and data['rank']:
            rank_map = {
                'resident': RankEnum.RESIDENT,
                'consultant': RankEnum.CONSULTANT
            }
            doctor.rank = rank_map.get(data['rank'].lower(), RankEnum.RESIDENT)
        
        doctor.set_password(data['password'])
        
        db.session.add(doctor)
        db.session.commit()
        
        # Create session token
        token = secrets.token_urlsafe(32)
        session = UserSession(
            doctor_id=doctor.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'token': token,
            'user': doctor.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.json
        print(data)
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        doctor = Doctor.query.filter_by(email=data['email']).first()
        
        if not doctor or not doctor.check_password(data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create session token
        token = secrets.token_urlsafe(32)
        session = UserSession(
            doctor_id=doctor.id,
            token=token,
            expires_at=datetime.utcnow() + timedelta(days=30)
        )
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'token': token,
            'user': doctor.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user():
    """Get current user info"""
    return jsonify(g.current_user.to_dict())

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout():
    """Logout user"""
    try:
        token = request.headers.get('Authorization')
        if token and token.startswith('Bearer '):
            token = token[7:]
            session = UserSession.query.filter_by(token=token).first()
            if session:
                db.session.delete(session)
                db.session.commit()
        
        return jsonify({'message': 'Logged out successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Doctor routes
@app.route('/api/doctors', methods=['GET'])
@optional_auth
def get_doctors():
    """Get all doctors"""
    doctors = Doctor.query.all()
    result = []
    
    for doctor in doctors:
        result.append(doctor.to_dict())
    return jsonify(result)

@app.route('/api/doctors/<int:doctor_id>', methods=['GET'])
@optional_auth
def get_doctor(doctor_id):
    """Get a specific doctor"""
    doctor = Doctor.query.get_or_404(doctor_id)
    return jsonify(doctor.to_dict())

@app.route('/api/doctors/<int:doctor_id>', methods=['PUT'])
@token_required
def update_doctor(doctor_id):
    """Update a doctor's information"""
    try:
        # Check if current user is manager or updating own profile
        if g.current_user.category != CategoryEnum.SENIOR and g.current_user.id != doctor_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        doctor = Doctor.query.get_or_404(doctor_id)
        data = request.json
        
        # Update allowed fields
        if 'firstName' in data:
            doctor.first_name = data['firstName']
        if 'lastName' in data:
            doctor.last_name = data['lastName']
        if 'email' in data:
            doctor.email = data['email']
        
        # Only managers can update role and category
        if g.current_user.category == CategoryEnum.SENIOR:
            if 'role' in data:
                doctor.category = CategoryEnum.SENIOR if data['role'] == 'manager' else CategoryEnum.JUNIOR
            if 'specialty' in data:
                specialty_map = {
                    'cardiology': SpecializationEnum.CARDIOLOGY,
                    'thoracic': SpecializationEnum.THORACIC,
                    'general': SpecializationEnum.GENERAL
                }
                doctor.specialization = specialty_map.get(data['specialty'].lower(), SpecializationEnum.GENERAL)
            if 'rank' in data:
                rank_map = {
                    'resident': RankEnum.RESIDENT,
                    'consultant': RankEnum.CONSULTANT
                }
                doctor.rank = rank_map.get(data['rank'].lower(), RankEnum.RESIDENT)
        
        doctor.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(doctor.to_dict())
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/doctors/<int:doctor_id>', methods=['DELETE'])
@token_required
def delete_doctor(doctor_id):
    """Delete a doctor (manager only)"""
    try:
        if g.current_user.category != CategoryEnum.SENIOR:
            return jsonify({'error': 'Unauthorized'}), 403
        
        doctor = Doctor.query.get_or_404(doctor_id)
        db.session.delete(doctor)
        db.session.commit()
        
        return jsonify({'message': 'Doctor deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Availability routes
@app.route('/api/availability/<int:doctor_id>', methods=['GET'])
@optional_auth
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
@token_required
def set_availability(doctor_id):
    """Set availability for a doctor on a specific date"""
    try:
        # Check if current user is authorized (must be the doctor or a manager)
        if g.current_user.id != doctor_id and g.current_user.category != CategoryEnum.SENIOR:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Validate that doctor exists
        doctor = Doctor.query.get_or_404(doctor_id)
        
        data = request.json
        
        # Handle bulk update
        if 'availability' in data:
            # Bulk update format from frontend
            for avail_data in data['availability']:
                try:
                    avail_date = datetime.strptime(avail_data['date'], '%Y-%m-%d').date()
                    
                    # Determine status from frontend format
                    if avail_data.get('isUnavailable'):
                        status = AvailabilityEnum.UNAVAILABLE
                    elif avail_data.get('isHoliday'):
                        status = AvailabilityEnum.HOLIDAY
                    else:
                        status = AvailabilityEnum.AVAILABLE
                    
                    # Check if an availability record already exists for this date
                    existing = Availability.query.filter_by(
                        doctor_id=doctor_id,
                        date=avail_date
                    ).first()
                    
                    if existing:
                        # Update existing record
                        existing.status = status
                        existing.notes = avail_data.get('notes')
                        existing.updated_at = datetime.utcnow()
                    else:
                        # Create new record
                        new_avail = Availability(
                            doctor_id=doctor_id,
                            date=avail_date,
                            status=status,
                            notes=avail_data.get('notes')
                        )
                        db.session.add(new_avail)
                        
                except Exception as e:
                    continue  # Skip invalid entries
        else:
            # Single update format
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
                existing.notes = data.get('notes')
                existing.updated_at = datetime.utcnow()
            else:
                # Create new record
                new_avail = Availability(
                    doctor_id=doctor_id,
                    date=avail_date,
                    status=status,
                    notes=data.get('notes')
                )
                db.session.add(new_avail)
        
        db.session.commit()
        return jsonify({"success": True})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 400

@app.route('/api/availability/all', methods=['GET'])
@optional_auth
def get_all_availability():
    """Get availability for all doctors"""
    try:
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'startDate and endDate are required'}), 400
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        # Get all availabilities in the date range
        availabilities = Availability.query.filter(
            Availability.date >= start_date,
            Availability.date <= end_date
        ).all()
        
        # Group by doctor
        result = {}
        for avail in availabilities:
            doctor_id = str(avail.doctor_id)
            if doctor_id not in result:
                result[doctor_id] = []
            result[doctor_id].append(avail.to_dict())
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/availability/summary', methods=['GET'])
@token_required
def get_availability_summary():
    """Get availability summary for managers"""
    try:
        if g.current_user.category != CategoryEnum.SENIOR:
            return jsonify({'error': 'Unauthorized'}), 403
        
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'startDate and endDate are required'}), 400
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        # Get all doctors
        doctors = Doctor.query.all()
        
        # Get doctors who haven't set any availability in the date range
        doctors_with_availability = db.session.query(Availability.doctor_id).filter(
            Availability.date >= start_date,
            Availability.date <= end_date
        ).distinct().all()
        
        doctors_with_availability_ids = {doc[0] for doc in doctors_with_availability}
        
        doctors_without_preferences = []
        for doctor in doctors:
            if doctor.id not in doctors_with_availability_ids:
                doctors_without_preferences.append(doctor.to_dict())
        
        return jsonify({
            'doctorsWithoutPreferences': doctors_without_preferences,
            'totalDoctors': len(doctors),
            'doctorsWithPreferences': len(doctors_with_availability_ids)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Hospital days routes
@app.route('/api/hospital-days', methods=['GET'])
@optional_auth
def get_hospital_days():
    """Get hospital days (on-call and public holidays)"""
    try:
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        
        # Build the query
        query = HospitalDay.query
        
        # Apply filters
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            query = query.filter(HospitalDay.date >= start_date)
        
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            query = query.filter(HospitalDay.date <= end_date)
        
        # Execute query
        hospital_days = query.all()
        
        # Format results
        result = []
        for day in hospital_days:
            result.append(day.to_dict())
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/hospital-days', methods=['POST'])
@token_required
def create_hospital_day():
    """Create or update a hospital day"""
    try:
        if g.current_user.category != CategoryEnum.SENIOR:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.json
        day_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
        
        # Check if exists
        existing = HospitalDay.query.filter_by(date=day_date).first()
        
        if existing:
            existing.is_on_call = data.get('isOnCall', existing.is_on_call)
            existing.is_public_holiday = data.get('isPublicHoliday', existing.is_public_holiday)
            existing.description = data.get('description', existing.description)
            existing.updated_at = datetime.utcnow()
        else:
            new_day = HospitalDay(
                date=day_date,
                is_on_call=data.get('isOnCall', False),
                is_public_holiday=data.get('isPublicHoliday', False),
                description=data.get('description')
            )
            db.session.add(new_day)
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Legacy holidays endpoint (for backward compatibility)
@app.route('/api/holidays', methods=['GET'])
@optional_auth
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

# Shift routes  
@app.route('/api/shifts', methods=['GET'])
@optional_auth
def get_shifts():
    """Get shifts with optional date range filtering"""
    # Get query parameters
    start_date_str = request.args.get('startDate')
    end_date_str = request.args.get('endDate')
    doctor_id = request.args.get('doctorId')
    
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
        query = query.filter(Shift.doctor_id == doctor_id)
    
    # Execute query
    shifts = query.all()
    
    # Format results
    result = []
    for shift in shifts:
        result.append({
            "id": shift.id,
            "date": shift.date.isoformat(),
            "doctor_id": shift.doctor_id,
            "hospital_id": shift.hospital_id,
            "role": shift.role,
            "is_override": shift.is_override
        })
    
    return jsonify(result)

@app.route('/api/schedule/generate', methods=['POST'])
@token_required
def generate_schedule():
    """Generate a schedule for a specific date range using SchedulingSolver"""
    try:
        if g.current_user.category != CategoryEnum.SENIOR:
            return jsonify({'error': 'Unauthorized'}), 403
        
        data = request.json
        print('Generating schedule with data:', data)
        start_date = datetime.strptime(data['startDate'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['endDate'], '%Y-%m-%d').date()
        
        # Calculate number of days
        num_days = (end_date - start_date).days + 1
        
        # Get all doctors from database
        doctors_from_db = Doctor.query.all()
        
        if len(doctors_from_db) == 0:
            return jsonify({'error': 'No doctors found in database'}), 400
        
        # Clear existing shifts for the date range
        Shift.query.filter(
            Shift.date >= start_date,
            Shift.date <= end_date
        ).delete()
        
        # Initialize scheduling solver
        solver = SchedulingSolver()
        
        # Override solver settings with our data
        solver.num_days = num_days
        solver.num_doctors = len(doctors_from_db)
        
        # Map database doctors to solver format
        solver.doctors = []
        doctor_id_mapping = {}  # Maps solver index to database doctor ID
        
        for i, doctor in enumerate(doctors_from_db):
            doctor_id_mapping[i] = doctor.id
            
            # Determine if doctor is senior (consultant or senior category)
            is_senior = (doctor.rank == RankEnum.CONSULTANT or doctor.category == CategoryEnum.SENIOR)
            
            # Determine rotation type
            rotation = None
            if doctor.specialization == SpecializationEnum.CARDIOLOGY:
                rotation = 'KX'
            elif doctor.specialization == SpecializationEnum.THORACIC:
                rotation = 'TX'
            elif doctor.abroad:
                rotation = 'outside'
            
            # Max shifts - can be adjusted based on doctor type
            max_shifts = 8  # Default
            if doctor.abroad:
                max_shifts = 3
            elif is_senior:
                max_shifts = 10
            
            # Add doctor to solver format: (name, is_senior, max_shifts, rotation, is_new, abroad, visiting)
            solver.doctors.append((
                f"{doctor.first_name} {doctor.last_name}",
                is_senior,
                max_shifts,
                rotation,
                doctor.is_new,
                doctor.abroad,
                doctor.visiting
            ))
        
        # Setup day types based on date range
        solver.day_type = []
        solver.day_of_week = []
        
        current_date = start_date
        for d in range(num_days):
            # Calculate day of week (0=Monday, 6=Sunday)
            day_of_week = current_date.weekday()
            solver.day_of_week.append(day_of_week)
            
            # For now, use a simple pattern for day types
            # You can enhance this based on your specific requirements
            if d % 4 == 0:
                solver.day_type.append("general")
            elif (d - 1) % 4 == 0:
                solver.day_type.append("post-general")
            elif (d + 1) % 4 == 0:
                solver.day_type.append("pre-general")
            else:
                solver.day_type.append("normal")
            
            current_date += timedelta(days=1)
        
        # Get public holidays from database
        holidays = HospitalDay.query.filter(
            HospitalDay.date >= start_date,
            HospitalDay.date <= end_date,
            HospitalDay.is_public_holiday == True
        ).all()
        
        solver.public_holidays = set()
        for holiday in holidays:
            day_index = (holiday.date - start_date).days
            if 0 <= day_index < num_days:
                solver.public_holidays.add(day_index)
        
        # Get doctor availabilities
        solver.availability = {}
        for i in range(solver.num_doctors):
            solver.availability[i] = {}
            
            db_doctor_id = doctor_id_mapping[i]
            availabilities = Availability.query.filter(
                Availability.doctor_id == db_doctor_id,
                Availability.date >= start_date,
                Availability.date <= end_date
            ).all()
            
            # Create availability map
            availability_map = {}
            for avail in availabilities:
                day_index = (avail.date - start_date).days
                if 0 <= day_index < num_days:
                    availability_map[day_index] = (avail.status == AvailabilityEnum.AVAILABLE)
            
            # Set availability for each day (default to True if not specified)
            for d in range(num_days):
                solver.availability[i][d] = availability_map.get(d, True)
        
        # Setup surgery days
        solver.setup_surgery_days()
        
        # Solve the scheduling problem
        results = solver.solve()
        print('Solver results:', results)
        if results['status'] in [4]:  # OPTIMAL or FEASIBLE
            # Save the generated schedule to database
            conflicts = []
            
            # Get default hospital
            default_hospital = Hospital.query.first()
            if not default_hospital:
                return jsonify({'error': 'No hospital found in database'}), 500
            
            current_date = start_date
            for d in range(num_days):
                if d in results['assignments']:
                    assignment = results['assignments'][d]
                    assigned_doctors = assignment['assigned_doctors']
                    
                    # Convert doctor names back to IDs and create shifts
                    for doctor_name in assigned_doctors:
                        # Find the doctor index by name
                        doctor_index = None
                        for i, (name, _, _, _, _, _, _) in enumerate(solver.doctors):
                            if name == doctor_name:
                                doctor_index = i
                                break
                        
                        if doctor_index is not None:
                            db_doctor_id = doctor_id_mapping[doctor_index]
                            
                            # Determine role based on day type
                            role = assignment['day_type']
                            if role == 'normal':
                                role = 'standard'
                            
                            new_shift = Shift(
                                date=current_date,
                                doctor_id=db_doctor_id,
                                hospital_id=default_hospital.id,
                                role=role,
                                is_override=True  # Mark as draft initially
                            )
                            db.session.add(new_shift)
                
                current_date += timedelta(days=1)
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'conflicts': conflicts,
                'message': 'Schedule generated successfully',
                'summary': results.get('summary', {}),
                'solver_status': results['status']
            })
        
        else:
            # Solver couldn't find a solution
            return jsonify({
                'success': False,
                'conflicts': ['Unable to generate a feasible schedule with current constraints'],
                'message': 'Schedule generation failed - no feasible solution found',
                'solver_status': results['status']
            })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/schedule/download', methods=['GET'])
@token_required
def download_schedule():
    """Download schedule as text file"""
    try:
        start_date_str = request.args.get('startDate')
        end_date_str = request.args.get('endDate')
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'startDate and endDate are required'}), 400
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        # Get shifts for the date range
        shifts = Shift.query.filter(
            Shift.date >= start_date,
            Shift.date <= end_date
        ).order_by(Shift.date).all()
        
        # Create text content
        content = f"Hospital Schedule ({start_date} to {end_date})\n"
        content += "=" * 50 + "\n\n"
        
        current_date = start_date
        while current_date <= end_date:
            day_shifts = [s for s in shifts if s.date == current_date]
            content += f"{current_date.strftime('%A, %B %d, %Y')}:\n"
            
            if day_shifts:
                for shift in day_shifts:
                    doctor_name = f"{shift.doctor.first_name} {shift.doctor.last_name}"
                    content += f"  - {doctor_name} ({shift.doctor.specialization.value})\n"
            else:
                content += "  - No shifts assigned\n"
            content += "\n"
            
            current_date += timedelta(days=1)
        
        # Create response
        response = make_response(content)
        response.headers['Content-Type'] = 'text/plain'
        response.headers['Content-Disposition'] = f'attachment; filename=schedule-{start_date}-to-{end_date}.txt'
        
        return response
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/schedule/edit', methods=['PUT'])
@token_required
def edit_schedule():
    """Edit schedule by adding or removing doctors from specific dates"""
    try:
        if g.current_user.category != CategoryEnum.SENIOR:
            return jsonify({'error': 'Unauthorized - Manager access required'}), 403
        
        data = request.json
        date_str = data.get('date')
        doctor_ids = data.get('doctorIds', [])
        
        if not date_str:
            return jsonify({'error': 'Date is required'}), 400
        
        schedule_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Get the default hospital
        hospital = Hospital.query.first()
        if not hospital:
            return jsonify({'error': 'No hospital found'}), 500
        
        # Remove all existing shifts for this date
        existing_shifts = Shift.query.filter_by(date=schedule_date).all()
        for shift in existing_shifts:
            db.session.delete(shift)
        
        # Add new shifts for the specified doctors
        for doctor_id in doctor_ids:
            doctor = Doctor.query.get(doctor_id)
            if doctor:
                new_shift = Shift(
                    date=schedule_date,
                    doctor_id=doctor_id,
                    hospital_id=hospital.id,
                    role='on_call',
                    is_override=True  # Mark as manually edited
                )
                db.session.add(new_shift)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Schedule updated for {schedule_date}',
            'date': date_str,
            'doctorIds': [str(id) for id in doctor_ids]
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/schedule/save', methods=['POST'])
@token_required
def save_schedule():
    """Save the entire schedule and mark it as finalized"""
    try:
        if g.current_user.category != CategoryEnum.SENIOR:
            return jsonify({'error': 'Unauthorized - Manager access required'}), 403
        
        data = request.json
        start_date_str = data.get('startDate')
        end_date_str = data.get('endDate')
        
        if not start_date_str or not end_date_str:
            return jsonify({'error': 'startDate and endDate are required'}), 400
        
        start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        
        # Mark all shifts in the date range as finalized (non-override)
        shifts = Shift.query.filter(
            Shift.date >= start_date,
            Shift.date <= end_date
        ).all()
        
        for shift in shifts:
            shift.is_override = False  # Mark as finalized
            shift.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Schedule saved and finalized for {start_date} to {end_date}',
            'shiftsCount': len(shifts)
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Profile routes
@app.route('/api/profile', methods=['PUT'])
@token_required
def update_profile():
    """Update current user's profile"""
    try:
        data = request.json
        doctor = g.current_user
        
        # Update allowed fields
        if 'firstName' in data:
            doctor.first_name = data['firstName']
        if 'lastName' in data:
            doctor.last_name = data['lastName']
        if 'email' in data:
            doctor.email = data['email']
        if 'specialty' in data:
            specialty_map = {
                'cardiology': SpecializationEnum.CARDIOLOGY,
                'thoracic': SpecializationEnum.THORACIC,
                'general': SpecializationEnum.GENERAL
            }
            doctor.specialization = specialty_map.get(data['specialty'].lower(), SpecializationEnum.GENERAL)
        if 'rank' in data:
            rank_map = {
                'resident': RankEnum.RESIDENT,
                'consultant': RankEnum.CONSULTANT
            }
            doctor.rank = rank_map.get(data['rank'].lower(), RankEnum.RESIDENT)
        
        doctor.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify(doctor.to_dict())
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Initialize database tables on startup
def create_tables():
    """Create database tables"""
    with app.app_context():
        db.create_all()
        
        # Create default hospital if it doesn't exist
        if not Hospital.query.first():
            default_hospital = Hospital(
                name="Main Hospital",
                location="City Center"
            )
            db.session.add(default_hospital)
            db.session.commit()
            
        # Add mock data for testing
        add_mock_data()

def add_mock_data():
    """Add mock data for testing"""
    # Add mock doctors if none exist
    if Doctor.query.count() == 0:
        # Manager
        manager = Doctor(
            first_name="John",
            last_name="Manager",
            username="manager",
            email="manager@hospital.com",
            rank=RankEnum.CONSULTANT,
            category=CategoryEnum.SENIOR,
            specialization=SpecializationEnum.CARDIOLOGY,
            is_new=False
        )
        manager.set_password("password123")
        
        # Senior Doctor
        senior_doc = Doctor(
            first_name="Sarah",
            last_name="Senior",
            username="senior",
            email="senior@hospital.com",
            rank=RankEnum.CONSULTANT,
            category=CategoryEnum.JUNIOR,
            specialization=SpecializationEnum.THORACIC,
            is_new=False
        )
        senior_doc.set_password("password123")
        
        # Junior Doctor
        junior_doc = Doctor(
            first_name="Mike",
            last_name="Junior",
            username="junior",
            email="junior@hospital.com",
            rank=RankEnum.RESIDENT,
            category=CategoryEnum.JUNIOR,
            specialization=SpecializationEnum.GENERAL,
            is_new=True
        )
        junior_doc.set_password("password123")
        
        # Viewer role (receptionist/viewer)
        viewer = Doctor(
            first_name="Emma",
            last_name="Viewer",
            username="viewer",
            email="viewer@hospital.com",
            rank=RankEnum.RESIDENT,
            category=CategoryEnum.JUNIOR,  # We'll handle viewer in frontend logic
            specialization=SpecializationEnum.GENERAL,
            is_new=False
        )
        viewer.set_password("password123")
        
        # Create list to hold all doctors
        all_doctors = [manager, senior_doc, junior_doc, viewer]
        
        # add 9 more senior doctors
        for i in range(1, 10):
            doc = Doctor(
                first_name=f"Senior{i}",
                last_name="Doctor",
                username=f"senior{i}",
                email=f"senior{i}@hospital.com",
                rank=RankEnum.CONSULTANT,
                category=CategoryEnum.SENIOR,
                specialization=SpecializationEnum.GENERAL,
                is_new=False
            )
            doc.set_password("password123")
            all_doctors.append(doc)

        db.session.add_all(all_doctors)
        db.session.commit()
        
        # Add some mock hospital days
        hospital_days = [
            HospitalDay(
                date=date(2025, 9, 15),  # Today + 3 days
                is_on_call=True,
                is_public_holiday=False,
                description="On-call day"
            ),
            HospitalDay(
                date=date(2025, 9, 25),  # Christmas
                is_on_call=False,
                is_public_holiday=True,
                description="Christmas Day"
            ),
            HospitalDay(
                date=date(2025, 10, 1),  # New Year
                is_on_call=False,
                is_public_holiday=True,
                description="New Year's Day"
            )
        ]
        
        for hospital_day in hospital_days:
            if not HospitalDay.query.filter_by(date=hospital_day.date).first():
                db.session.add(hospital_day)
        
        db.session.commit()
        
        print("Mock data added successfully!")

if __name__ == '__main__':
    try:
        print("Initializing Flask application...")
        # Initialize database tables
        create_tables()
        
        # Use PORT environment variable provided by Railway
        port = int(os.environ.get('PORT', 5001))
        debug = os.environ.get('FLASK_ENV') == 'development'
        
        print(f"Starting Flask server on port {port}")
        print("Server is ready to accept requests...")
        app.run(debug=debug, port=port, host='0.0.0.0')
    except Exception as e:
        print(f"Error starting server: {e}")
        import traceback
        traceback.print_exc()
