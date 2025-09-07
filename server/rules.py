"""
Rules Engine for Doctor Scheduling

This module contains the implementation of scheduling rules and constraints
for doctor shift assignments.
"""

from datetime import datetime, timedelta, date
from typing import List, Dict, Optional, Any, Tuple
from calendar import monthrange
import calendar
from models import db, Doctor, Shift, Availability, Hospital, AvailabilityEnum, RankEnum

class RuleViolation:
    def __init__(self, rule_name: str, description: str, severity: str = "error"):
        self.rule_name = rule_name
        self.description = description
        self.severity = severity  # error, warning, info
    
    def __str__(self):
        return f"{self.rule_name}: {self.description} ({self.severity})"

class RulesEngine:
    def __init__(self, hospital_id: int = 1):  # Default to Attikon hospital
        self.hospital_id = hospital_id
    
    def validate_shift_assignment(self, doctor_id: int, shift_date: date) -> List[RuleViolation]:
        """
        Validates if assigning a shift to a doctor on a specific date violates any rules.
        
        Args:
            doctor_id: The ID of the doctor to check
            shift_date: The date of the shift
            
        Returns:
            List of rule violations, empty if no rules are violated
        """
        violations = []
        
        # Append rule violations from individual rule checks
        violations.extend(self._check_consecutive_shifts(doctor_id, shift_date))
        violations.extend(self._check_monthly_shift_count(doctor_id, shift_date))
        
        return violations
    
    def _check_consecutive_shifts(self, doctor_id: int, shift_date: date) -> List[RuleViolation]:
        """
        Rule B: No consecutive shifts
        - After each on-call shift, the resident must have a REPO (rest day)
        - Cannot be scheduled on consecutive days at this hospital
        """
        violations = []
        
        # Check if the doctor has a shift on the day before
        prev_day = shift_date - timedelta(days=1)
        prev_shift = Shift.query.filter_by(
            doctor_id=doctor_id,
            hospital_id=self.hospital_id,
            date=prev_day
        ).first()
        
        if prev_shift:
            violations.append(
                RuleViolation(
                    "rule_b_consecutive_shifts",
                    f"Doctor has a shift on the previous day ({prev_day.strftime('%Y-%m-%d')}). Must have a rest day after each shift."
                )
            )
        
        # Check if the doctor has a shift on the day after
        next_day = shift_date + timedelta(days=1)
        next_shift = Shift.query.filter_by(
            doctor_id=doctor_id,
            hospital_id=self.hospital_id,
            date=next_day
        ).first()
        
        if next_shift:
            violations.append(
                RuleViolation(
                    "rule_b_consecutive_shifts",
                    f"Doctor has a shift on the following day ({next_day.strftime('%Y-%m-%d')}). Must have a rest day after each shift."
                )
            )
        
        return violations
    
    def _check_monthly_shift_count(self, doctor_id: int, shift_date: date) -> List[RuleViolation]:
        """
        Rule A: Number of On-Site Shifts
        - Each intern must do 7 shifts per month
        - They may opt to do up to 8 shifts to fill scheduling gaps
        - Breakdown: 5 weekdays + 1 Saturday + 1 Sunday (or holiday)
        """
        violations = []
        
        # Get the doctor's rank
        doctor = Doctor.query.get(doctor_id)
        if not doctor:
            violations.append(
                RuleViolation(
                    "invalid_doctor",
                    f"Doctor with ID {doctor_id} not found.",
                    "error"
                )
            )
            return violations
        
        # Only apply this rule to interns
        if doctor.rank != RankEnum.INTERN:
            return violations
            
        # Get first and last day of the month
        year, month = shift_date.year, shift_date.month
        first_day = date(year, month, 1)
        _, last_day_num = monthrange(year, month)
        last_day = date(year, month, last_day_num)
        
        # Get all shifts for this doctor in this month at this hospital
        shifts = Shift.query.filter(
            Shift.doctor_id == doctor_id,
            Shift.hospital_id == self.hospital_id,
            Shift.date >= first_day,
            Shift.date <= last_day
        ).all()
        
        # Count shifts by day type
        weekday_shifts = 0
        saturday_shifts = 0
        sunday_holiday_shifts = 0
        
        for shift in shifts:
            weekday = shift.date.weekday()
            if weekday < 5:  # Monday to Friday
                weekday_shifts += 1
            elif weekday == 5:  # Saturday
                saturday_shifts += 1
            elif weekday == 6:  # Sunday
                sunday_holiday_shifts += 1
        
        # Check if adding a new shift would exceed the maximum
        total_shifts = len(shifts)
        if shift_date not in [s.date for s in shifts]:  # Only if this is a new shift
            total_shifts += 1
            
            # Update the counts based on the new shift date
            weekday = shift_date.weekday()
            if weekday < 5:
                weekday_shifts += 1
            elif weekday == 5:
                saturday_shifts += 1
            elif weekday == 6:
                sunday_holiday_shifts += 1
        
        # Rule A violations
        if total_shifts > 8:
            violations.append(
                RuleViolation(
                    "rule_a_max_shifts",
                    f"Exceeds maximum of 8 shifts per month (current: {total_shifts - 1}, adding: 1).",
                    "error"
                )
            )
        
        if weekday_shifts > 5:
            violations.append(
                RuleViolation(
                    "rule_a_weekday_shifts",
                    f"Exceeds maximum of 5 weekday shifts (current: {weekday_shifts}).",
                    "error"
                )
            )
        
        # Check if there's proper balance between Saturday and Sunday shifts
        if saturday_shifts > 2 and sunday_holiday_shifts == 0:
            violations.append(
                RuleViolation(
                    "rule_a_weekend_balance",
                    f"Has {saturday_shifts} Saturday shifts but no Sunday/holiday shifts.",
                    "warning"
                )
            )
        
        if sunday_holiday_shifts > 2 and saturday_shifts == 0:
            violations.append(
                RuleViolation(
                    "rule_a_weekend_balance",
                    f"Has {sunday_holiday_shifts} Sunday shifts but no Saturday shifts.",
                    "warning"
                )
            )
        
        return violations
    
    def generate_monthly_schedule(self, year: int, month: int) -> Dict[str, Any]:
        """
        Generate a monthly schedule for all doctors at the hospital
        
        Returns:
            Dictionary with schedule information and any issues encountered
        """
        # Set up the schedule structure
        first_day = date(year, month, 1)
        _, last_day_num = monthrange(year, month)
        last_day = date(year, month, last_day_num)
        
        # Get all doctors
        doctors = Doctor.query.all()
        
        # Get doctor availability for the month
        doctor_availabilities = {}
        for doctor in doctors:
            avails = Availability.query.filter(
                Availability.doctor_id == doctor.id,
                Availability.date >= first_day,
                Availability.date <= last_day
            ).all()
            
            # Map availabilities by date for quick lookup
            doctor_availabilities[doctor.id] = {
                avail.date: avail.status for avail in avails
            }
        
        # Clear existing shifts for this month to avoid duplicates
        Shift.query.filter(
            Shift.hospital_id == self.hospital_id,
            Shift.date >= first_day,
            Shift.date <= last_day
        ).delete()
        
        # Dictionary to track shifts assigned per doctor
        shifts_per_doctor = {doctor.id: 0 for doctor in doctors}
        weekday_shifts_per_doctor = {doctor.id: 0 for doctor in doctors}
        weekend_shifts_per_doctor = {doctor.id: 0 for doctor in doctors}
        
        # List to collect all issues encountered
        all_issues = []
        shifts_assigned = 0
        
        # Generate schedule day by day
        current_date = first_day
        while current_date <= last_day:
            # Determine which doctors are eligible for this day
            eligible_doctors = []
            for doctor in doctors:
                # Skip if doctor has violated max shift rules
                if shifts_per_doctor[doctor.id] >= 8:  # Max shifts rule
                    continue
                    
                # Skip if doctor already has too many weekday/weekend shifts
                if current_date.weekday() < 5 and weekday_shifts_per_doctor[doctor.id] >= 5:
                    continue
                    
                # Check doctor availability preference
                avail_status = doctor_availabilities.get(doctor.id, {}).get(current_date)
                
                # If doctor is explicitly unavailable, skip
                if avail_status == AvailabilityEnum.UNAVAILABLE:
                    continue
                
                # Check for rule violations
                violations = self.validate_shift_assignment(doctor.id, current_date)
                if any(v.severity == "error" for v in violations):
                    continue
                    
                # Doctor is eligible - calculate priority score
                priority = 0
                
                # Preferred dates get highest priority
                if avail_status == AvailabilityEnum.PREFERRED:
                    priority += 10
                    
                # Balance shifts between doctors
                priority -= shifts_per_doctor[doctor.id]
                
                # Add to eligible list with priority score
                eligible_doctors.append({
                    "doctor": doctor,
                    "priority": priority,
                    "violations": [v for v in violations if v.severity != "error"]  # Keep warnings
                })
            
            # Sort eligible doctors by priority (highest first)
            eligible_doctors.sort(key=lambda x: x["priority"], reverse=True)
            
            # Assign shift to highest priority doctor
            if eligible_doctors:
                assigned_doctor = eligible_doctors[0]["doctor"]
                
                # Create the shift
                new_shift = Shift(
                    doctor_id=assigned_doctor.id,
                    hospital_id=self.hospital_id,
                    date=current_date
                )
                db.session.add(new_shift)
                
                # Update tracking
                shifts_per_doctor[assigned_doctor.id] += 1
                if current_date.weekday() < 5:  # Weekday
                    weekday_shifts_per_doctor[assigned_doctor.id] += 1
                else:  # Weekend
                    weekend_shifts_per_doctor[assigned_doctor.id] += 1
                
                shifts_assigned += 1
                
                # Log any warnings
                for warning in eligible_doctors[0]["violations"]:
                    all_issues.append({
                        "date": current_date.isoformat(),
                        "doctor_id": assigned_doctor.id,
                        "doctor_name": f"{assigned_doctor.first_name} {assigned_doctor.last_name}",
                        "type": warning.severity,
                        "message": warning.description
                    })
            else:
                # No eligible doctors found for this day
                all_issues.append({
                    "date": current_date.isoformat(),
                    "doctor_id": None,
                    "doctor_name": None,
                    "type": "error",
                    "message": f"No eligible doctors found for {current_date.isoformat()}"
                })
            
            # Move to next day
            current_date += timedelta(days=1)
        
        # Commit all changes to database
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            return {
                "schedule_generated": False,
                "year": year,
                "month": month,
                "hospital_id": self.hospital_id,
                "shifts_assigned": 0,
                "issues": [{"type": "error", "message": f"Database error: {str(e)}"}]
            }
            
        return {
            "schedule_generated": True,
            "year": year,
            "month": month,
            "hospital_id": self.hospital_id,
            "shifts_assigned": shifts_assigned,
            "issues": all_issues
        }
    
    def validate_overall_schedule(self, year: int, month: int) -> List[RuleViolation]:
        """
        Validates the entire schedule for a given month against all rules
        
        Returns:
            List of rule violations across all doctors and shifts
        """
        violations = []
        
        # Get number of doctors
        doctor_count = Doctor.query.count()
        
        # Get first and last day of the month
        first_day = date(year, month, 1)
        _, last_day_num = monthrange(year, month)
        last_day = date(year, month, last_day_num)
        
        # Get total shifts in the month
        total_shifts = Shift.query.filter(
            Shift.hospital_id == self.hospital_id,
            Shift.date >= first_day,
            Shift.date <= last_day
        ).count()
        
        # Rule: Each month must have at least 2x number of doctors in shifts
        min_required_shifts = doctor_count * 2
        if total_shifts < min_required_shifts:
            violations.append(
                RuleViolation(
                    "min_total_shifts",
                    f"Month has {total_shifts} shifts, but requires at least {min_required_shifts} (2 × {doctor_count} doctors).",
                    "error"
                )
            )
        
        # Rule: Each month must have at most 3x number of doctors in shifts
        max_allowed_shifts = doctor_count * 3
        if total_shifts > max_allowed_shifts:
            violations.append(
                RuleViolation(
                    "max_total_shifts",
                    f"Month has {total_shifts} shifts, but allows at most {max_allowed_shifts} (3 × {doctor_count} doctors).",
                    "error"
                )
            )
        
        return violations
