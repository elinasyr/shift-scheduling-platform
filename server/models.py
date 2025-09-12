from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import Enum, CheckConstraint, ForeignKey
from werkzeug.security import generate_password_hash, check_password_hash
import enum

db = SQLAlchemy()

class RankEnum(enum.Enum):
    RESIDENT = "resident"
    CONSULTANT = "consultant"

class RotationTypeEnum(enum.Enum):
    OUTSIDE = "outside"
    VISITING = "visiting" 
    INTERNAL = "internal"
    ABROAD = "abroad"

class SpecializationEnum(enum.Enum):
    CARDIOLOGY = "cardiology" # kx
    THORACIC = "thoracic" # θχ
    GENERAL = "general" # Other

class CategoryEnum(enum.Enum):
    JUNIOR = "junior"
    SENIOR = "senior"

class AvailabilityEnum(enum.Enum):
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    HOLIDAY = "holiday"

class HolidayType(enum.Enum):
    REGULAR = "regular"
    NATIONAL = "national"
    RELIGIOUS = "religious"
    SPECIAL = "special"

class Doctor(db.Model):
    __tablename__ = 'doctors'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    rank = db.Column(Enum(RankEnum), nullable=False)
    is_new = db.Column(db.Boolean, default=False)
    category = db.Column(Enum(CategoryEnum), nullable=False)
    specialization = db.Column(Enum(SpecializationEnum), nullable=False)
    abroad = db.Column(db.Boolean, default=False) # για άσκηση στο εξωτερικό
    visiting = db.Column(db.Boolean, default=False) # εμβολίμοι από άλλα νοσοκομεία
    profile_photo = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    availabilities = db.relationship('Availability', back_populates='doctor', cascade='all, delete-orphan')
    shifts = db.relationship('Shift', back_populates='doctor', cascade='all, delete-orphan')
    rotations = db.relationship('Rotation', back_populates='doctor', cascade='all, delete-orphan')
    
    def set_password(self, password):
        """Set password hash"""
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        """Check password against hash"""
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        # Map category to frontend role
        role_mapping = {
            (CategoryEnum.SENIOR, False): 'manager',
            (CategoryEnum.JUNIOR, False): 'doctor',
            (CategoryEnum.JUNIOR, True): 'viewer'  # Viewer role for special junior doctors
        }
        
        # Determine role based on username or email for now (can be enhanced)
        is_viewer = 'viewer' in self.username.lower() or 'viewer' in self.email.lower()
        role = role_mapping.get((self.category, is_viewer), 'doctor')
        
        return {
            'id': self.id,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'username': self.username,
            'email': self.email,
            'role': role,
            'rank': self.rank.value,
            'category': self.category.value,
            'specialty': self.specialization.value,
            'specialization': self.specialization.value,
            'profilePhoto': self.profile_photo,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
        
    def __repr__(self):
        return f'<Doctor {self.first_name} {self.last_name}, {self.rank.value}>'

class Hospital(db.Model):
    __tablename__ = 'hospitals'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    shifts = db.relationship('Shift', back_populates='hospital', cascade='all, delete-orphan')
    rotations = db.relationship('Rotation', back_populates='hospital', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Hospital {self.name}>'

class Shift(db.Model):
    __tablename__ = 'shifts'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id'), nullable=False)
    role = db.Column(db.String(50), default='standard') # general, post-general, MTX, etc.
    is_override = db.Column(db.Boolean, default=False)  # True if manager override
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    doctor = db.relationship('Doctor', back_populates='shifts')
    hospital = db.relationship('Hospital', back_populates='shifts')
    
    def __repr__(self):
        return f'<Shift {self.date} - Doctor {self.doctor_id} - Hospital {self.hospital_id}>'

class Availability(db.Model):
    __tablename__ = 'availabilities'
    
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(Enum(AvailabilityEnum), nullable=False)
    notes = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    doctor = db.relationship('Doctor', back_populates='availabilities')
    
    # Unique constraint to ensure one availability entry per doctor per day
    __table_args__ = (
        db.UniqueConstraint('doctor_id', 'date', name='unique_doctor_date'),
    )
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'doctorId': str(self.doctor_id),
            'date': self.date.isoformat(),
            'isAvailable': self.status == AvailabilityEnum.AVAILABLE,
            'isUnavailable': self.status == AvailabilityEnum.UNAVAILABLE,
            'isHoliday': self.status == AvailabilityEnum.HOLIDAY,
            'notes': self.notes
        }
    
    def __repr__(self):
        return f'<Availability Doctor {self.doctor_id} - {self.date} - {self.status.value}>'

class Holiday(db.Model):
    __tablename__ = 'holidays'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(Enum(HolidayType), default=HolidayType.REGULAR)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<Holiday {self.name} - {self.date}>'

class Rotation(db.Model):
    __tablename__ = 'rotations'
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    hospital_id = db.Column(db.Integer, db.ForeignKey('hospitals.id'), nullable=True)
    type = db.Column(Enum(RotationTypeEnum), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)

    doctor = db.relationship('Doctor', back_populates='rotations')
    hospital = db.relationship('Hospital', back_populates='rotations')

class HospitalDay(db.Model):
    __tablename__ = 'hospital_days'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)
    is_on_call = db.Column(db.Boolean, default=False)
    is_public_holiday = db.Column(db.Boolean, default=False)
    description = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': str(self.id),
            'date': self.date.isoformat(),
            'isOnCall': self.is_on_call,
            'isPublicHoliday': self.is_public_holiday,
            'description': self.description
        }

class UserSession(db.Model):
    __tablename__ = 'user_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    doctor_id = db.Column(db.Integer, db.ForeignKey('doctors.id'), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    
    # Relationships
    doctor = db.relationship('Doctor', backref='sessions')
