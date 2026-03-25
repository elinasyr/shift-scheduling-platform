import json
import os
import sys
from datetime import datetime
from models import db, Doctor, Availability, AvailabilityEnum, UserSession
from app import app

# Load the dictionary from JSON file
with open('sample_march.json', 'r') as f:
    march_data = json.load(f)

def main():
    """Add March data to the database"""
    with app.app_context():
        try:
            # Step 1: Delete all doctors except the manager
            # print("Step 1: Deleting all doctors except manager...")
            # manager = Doctor.query.filter_by(email='jean.evgenidis@gmail.com').first()
            # if not manager:
            #     print("ERROR: Manager not found!")
            #     return
            
            # # Delete all user sessions for doctors except the manager
            # doctors_to_delete = Doctor.query.filter(Doctor.email != 'jean.evgenidis@gmail.com').all()
            # doctor_ids_to_delete = [doc.id for doc in doctors_to_delete]
            
            # # Delete sessions first to avoid foreign key constraints
            # UserSession.query.filter(UserSession.doctor_id.in_(doctor_ids_to_delete)).delete(synchronize_session=False)
            
            # # Delete all doctors except the manager
            # for doctor in doctors_to_delete:
            #     db.session.delete(doctor)
            # db.session.commit()
            # print(f"Deleted {len(doctors_to_delete)} doctors")
            
            # # Step 2: Delete all availabilities
            # print("\nStep 2: Deleting all availabilities...")
            # availabilities = Availability.query.all()
            # for avail in availabilities:
            #     db.session.delete(avail)
            # db.session.commit()
            # print(f"Deleted {len(availabilities)} availability entries")
            
            # # Step 3: Add new doctors from the dictionary keys
            # print("\nStep 3: Adding new doctors from March data...")
            # new_doctors = []
            # for i, greek_name in enumerate(march_data.keys(), 1):
            #     # Generate email and username from the Greek name
            #     # Replace spaces and special characters with underscores
            #     base_name = greek_name.lower().replace(' ', '_')
            #     email = f"{base_name}@hospital.com"
            #     username = base_name
                
            #     # Check if doctor already exists
            #     if Doctor.query.filter_by(email=email).first():
            #         print(f"  Skipping {greek_name} - already exists")
            #         continue
                
            #     # Create new doctor
            #     doctor = Doctor(
            #         first_name=greek_name,
            #         last_name="Doctor",
            #         username=username,
            #         email=email,
            #         rotation_type=None,
            #         rank=None,
            #         category=None,
            #         specialization=None,
            #         is_approved=True,
            #         is_new=False
            #     )
            #     doctor.set_password("password123")
            #     db.session.add(doctor)
            #     new_doctors.append(doctor)
            #     print(f"  Created doctor: {greek_name} ({email})")
            
            # db.session.commit()
            # print(f"Added {len(new_doctors)} new doctors")
            
            # Step 4: Insert availabilities from the dictionary values
            print("\nStep 4: Adding availabilities for new doctors...")
            total_availabilities = 0
            
            for greek_name, dates in march_data.items():
                # Find the doctor by name
                doctor = Doctor.query.filter_by(first_name=greek_name).first()
                if not doctor:
                    print(f"  ERROR: Doctor {greek_name} not found!")
                    continue
                
                # Add availability for each date
                for date_str in dates:
                    avail_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    availability = Availability(
                        doctor_id=doctor.id,
                        date=avail_date,
                        status=AvailabilityEnum.AVAILABLE
                    )
                    db.session.add(availability)
                    total_availabilities += 1
                
                print(f"  Added {len(dates)} availabilities for {greek_name}")
            
            db.session.commit()
            print(f"\nTotal availabilities added: {total_availabilities}")
            print("\n✅ March data import completed successfully!")
            
        except Exception as e:
            db.session.rollback()
            print(f"\n❌ Error: {e}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

if __name__ == '__main__':
    main()
