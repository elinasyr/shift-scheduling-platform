from ortools.sat.python import cp_model
import calendar
from typing import List, Tuple, Set, Dict, Optional, Any, Union
import time

class SchedulingSolver:
    def __init__(self):
        self.model = None
        self.shift = None
        self.solver = None
        self.num_days = 30
        self.num_doctors = 10
        self.doctors = []
        self.day_type = []
        self.day_of_week = []
        self.public_holidays = set()
        self.availability = {}
        self.KX_surgery_days = set()
        self.TX_surgery_days = set()
        
        self.target_weekdays = 5
        self.target_sat = 1
        self.target_sun_hol = 1
        self.target_total = 7 # can also be 8 - must find a way to add this relaxation if needed
        
        # Solver parameters
        self.solver_time_limit_seconds = 180  # Increase time limit to 3 minutes
        
    def setup_default_data(self):
        """Sets up default data for the scheduling problem - only if no real data exists."""
        # Only set defaults if no data has been provided from the database
        if not hasattr(self, 'doctors') or not self.doctors:
            # --------------------
            # Parameters / Data
            # --------------------
            self.num_days = 30
            self.num_doctors = 1

            # Γιατροί: κάθε tuple = (όνομα, είναι_μεγάλος, max_shifts, rotation, is_new)
            # rotation: None | 'outside' | 'KX' | 'TX'
            # is_new: True αν ο ειδικευόμενος είναι νέος (κανόνας θ)
            self.doctors = []
            for i in range(self.num_doctors):
                if i < 3:
                    rot = 'outside'
                elif 3 <= i < 7:
                    rot = 'KX'
                elif 7 <= i < 11:
                    rot = 'TX'
                else:
                    rot = None
                is_new = (i >= 11)  # πχ οι τελευταίοι 2 είναι νέοι
                abroad = (i == 0) # πχ doctor_0 ασκείται στο εξωτερικό
                visiting = (i == 1) # πχ doctor_1 είναι εμβολίμος
                self.doctors.append((f"Doctor_{i}", (i % 3 == 0), 8, rot, is_new, abroad, visiting))
        
        # Update num_doctors based on actual doctors list
        self.num_doctors = len(self.doctors)

    def setup_day_types(self):
        """Sets up day types for the scheduling problem."""
        # Labels ημερών
        # πχ κάθε 4η μέρα γενική, η επομένη μετά-γενικής, η προηγούμενη προ-γενικής
        self.day_type = []
        for d in range(self.num_days):
            if d % 4 == 0:
                self.day_type.append("general")
            elif (d - 1) % 4 == 0:
                self.day_type.append("pre-general")
            elif (d + 1) % 4 == 0:
                self.day_type.append("post-general")
            else:
                self.day_type.append("normal")

        # Θεωρούμε ότι ο μήνας ξεκινάει Δευτέρα (0=Δευτέρα)
        self.day_of_week = [(d % 7) for d in range(self.num_days)]  # 0=Δευτέρα ... 5=Σάββατο, 6=Κυριακή

        # Only set default availability if none has been provided
        if not hasattr(self, 'availability') or not self.availability:
            # Διαθεσιμότητες - default all available
            self.availability = {i: {d: True for d in range(self.num_days)} for i in range(self.num_doctors)}

        # Only set default public holidays if none have been provided
        if not hasattr(self, 'public_holidays'):
            # Δηλώσεις αργιών (προς το παρόν none)
            self.public_holidays = set()  

    def setup_surgery_days(self):
        """Sets up surgery days for KX and TX rotations."""
        # Surgery schedules for KX and TX rotations
        self.KX_surgery_days = {d for d in range(self.num_days) if self.day_of_week[d] in {0, 2, 4}}
        self.TX_surgery_days = {d for d in range(self.num_days) if self.day_of_week[d] in {1, 3}}
        
    def initialize_model(self):
        """Initializes the CP model and creates variables."""
        # --------------------
        # Model
        # --------------------
        self.model = cp_model.CpModel()

        # Variables
        self.shift = {}
        for d in range(self.num_days):
            for i in range(self.num_doctors):
                self.shift[(d, i)] = self.model.NewBoolVar(f"shift_d{d}_i{i}")

    def add_hard_constraints(self):
        """Adds hard constraints to the model."""
        # --------------------
        # Hard constraints
        # --------------------
        for d in range(self.num_days):
            # Πόσοι πρέπει να είναι εκείνη τη μέρα
            if self.day_type[d] == "general":
                min_doctors, max_doctors = 2, 3
            elif self.day_type[d] == "post-general":
                min_doctors, max_doctors = 2, 3
            else:
                min_doctors, max_doctors = 2, 2

            self.model.Add(sum(self.shift[(d, i)] for i in range(self.num_doctors)) >= min_doctors)
            self.model.Add(sum(self.shift[(d, i)] for i in range(self.num_doctors)) <= max_doctors)

            # Τουλάχιστον ένας μεγάλος
            big_residents = [self.shift[(d, i)] for i, doc in enumerate(self.doctors) if doc[1]]
            if big_residents:
                self.model.Add(sum(big_residents) >= 1)

            # Νέοι ειδικευόμενοι
            new_residents = [i for i, doc in enumerate(self.doctors) if doc[4]]
            if self.day_type[d] == "post-general":
                # Δεν μπαίνουν σε μετά-γενικής
                for i in new_residents:
                    self.model.Add(self.shift[(d, i)] == 0)
            
            # # Άσκηση στο εξωτερικό (ι)
            abroad_residents = [i for i, doc in enumerate(self.doctors) if doc[5]]
            print(f"Abroad residents: {abroad_residents}")
            for i in abroad_residents:
                self.model.Add(self.shift[(d, i)] == 0)


    def add_consecutive_days_constraint(self):
        """Add constraint that no one works two consecutive days."""
        # Κανένας δεν κάνει 2 μέρες συνεχόμενες (ρεπό)
        for i in range(self.num_doctors):
            for d in range(self.num_days - 1):
                self.model.Add(self.shift[(d, i)] + self.shift[(d + 1, i)] <= 1)

    def add_rotation_rules(self):
        """Adds rotation-specific rules."""
        # Rotations rules
        for i, (_, _, max_shifts, rot, _, abroad, _) in enumerate(self.doctors):
            # Skip constraints for doctors abroad
            # if abroad:
            #     continue
                
            if rot == 'outside':
                # Make this a soft constraint instead of hard
                # Instead of requiring exactly 3, let's just limit to max 3
                self.model.Add(sum(self.shift[(d, i)] for d in range(self.num_days)) <= 3)
            if rot == 'KX':
                for d in self.KX_surgery_days:
                    prev = d - 1
                    if prev >= 0:
                        self.model.Add(self.shift[(prev, i)] == 0)
            if rot == 'TX':
                for d in self.TX_surgery_days:
                    prev = d - 1
                    if prev >= 0:
                        self.model.Add(self.shift[(prev, i)] == 0)

    def add_max_shifts_constraint(self):
        """Ensures no doctor exceeds their maximum shifts."""
        # Κανένας δεν ξεπερνά το max_shifts
        for i, (_, _, max_shifts, _, _, _, _) in enumerate(self.doctors):
            self.model.Add(sum(self.shift[(d, i)] for d in range(self.num_days)) <= max_shifts)

    def add_total_shifts_constraint(self):
        """Add constraints on total shifts across all doctors."""
        # Constraint α) Total shifts per month
        # Relax the constraints a bit to ensure feasibility
        min_total_shifts = int(1.8 * self.num_days)  # Reduced from 2*days
        max_total_shifts = int(3.2 * self.num_days)  # Increased from 3*days
        
        print(f"Total shifts bounds: {min_total_shifts} to {max_total_shifts}")
        
        self.model.Add(sum(self.shift[(d, i)] for d in range(self.num_days) 
                         for i in range(self.num_doctors)) >= min_total_shifts)
        self.model.Add(sum(self.shift[(d, i)] for d in range(self.num_days) 
                         for i in range(self.num_doctors)) <= max_total_shifts)

    def calculate_day_categories(self):
        """Calculate weekday, saturday, and sunday/holiday lists."""
        # --------------------
        # Soft constraints / fairness targets (γ)
        # --------------------
        self.weekday_days = [d for d in range(self.num_days) 
                            if self.day_of_week[d] in {0,1,2,3,4} and d not in self.public_holidays]
        self.saturday_days = [d for d in range(self.num_days) if self.day_of_week[d] == 5]
        self.sun_hol_days = [d for d in range(self.num_days) 
                            if self.day_of_week[d] == 6 or d in self.public_holidays]
    
    def add_deviation(self, expr, target, name_prefix):
        """Helper function to model deviation from targets."""
        dev_pos = self.model.NewIntVar(0, 100, name_prefix + "_pos")
        dev_neg = self.model.NewIntVar(0, 100, name_prefix + "_neg")
        self.model.Add(expr - target == dev_pos - dev_neg)
        return dev_pos, dev_neg

    def add_fairness_constraints(self):
        """Add fairness constraints and penalties."""
        penalties = []
        for i in range(self.num_doctors):
            wd_sum = sum(self.shift[(d, i)] for d in self.weekday_days)
            sat_sum = sum(self.shift[(d, i)] for d in self.saturday_days)
            sh_sum = sum(self.shift[(d, i)] for d in self.sun_hol_days)
            total_sum = sum(self.shift[(d, i)] for d in range(self.num_days))

            self.model.Add(sat_sum <= 2)
            self.model.Add(sh_sum <= 2)

            wd_pos, wd_neg = self.add_deviation(wd_sum, self.target_weekdays, f"i{i}_wd")
            sat_pos, sat_neg = self.add_deviation(sat_sum, self.target_sat, f"i{i}_sat")
            sh_pos, sh_neg = self.add_deviation(sh_sum, self.target_sun_hol, f"i{i}_sh")
            tt_pos, tt_neg = self.add_deviation(total_sum, self.target_total, f"i{i}_tot")

            penalties.extend([wd_pos*2, wd_neg*2, sat_pos*6, sat_neg*4, sh_pos*7, sh_neg*5, tt_pos*8, tt_neg*8])
        
        return penalties

    def add_preferred_staffing(self):
        """Add soft constraint for preferring 3 people on general/post-general days."""
        penalties = []
        # Optional soft: προτιμούμε 3 άτομα στις general/post-general
        for d in range(self.num_days):
            if self.day_type[d] in {"general", "post-general"}:
                staff = sum(self.shift[(d, i)] for i in range(self.num_doctors))
                devp = self.model.NewIntVar(0, 3, f"d{d}_staff_devp")
                devn = self.model.NewIntVar(0, 3, f"d{d}_staff_devn")
                self.model.Add(staff - 3 == devp - devn)
                penalties.extend([devp*2, devn*1])
        return penalties
    
    def add_unavailability_constraints(self):
        """Add constraints based on doctor unavailability."""
        for i in range(self.num_doctors):
            for d in range(self.num_days):
                if not self.availability[i].get(d, True):
                    self.model.Add(self.shift[(d, i)] == 0)
        
    def solve(self):
        """Sets up and solves the model."""
        self.setup_default_data()
        self.setup_day_types()
        self.setup_surgery_days()
        self.initialize_model()
        self.add_hard_constraints()
        self.add_consecutive_days_constraint()
        self.add_rotation_rules()
        self.add_max_shifts_constraint()
        self.add_total_shifts_constraint()
        self.add_unavailability_constraints()

        self.calculate_day_categories()
        penalties = self.add_fairness_constraints()
        penalties.extend(self.add_preferred_staffing())
        
        self.model.Minimize(sum(penalties))
        
        # --------------------
        # Solve
        # --------------------
        self.solver = cp_model.CpSolver()
        self.solver.parameters.max_time_in_seconds = self.solver_time_limit_seconds
        
        # Add logging for debugging
        print("Starting to solve the model...")
        print(f"Number of days: {self.num_days}")
        print(f"Number of doctors: {self.num_doctors}")
        print(f"Public holidays: {self.public_holidays}")
        print(f"Time limit: {self.solver_time_limit_seconds} seconds")
        
        status = self.solver.Solve(self.model)
        
        # Debug status
        print(f"Solver status: {status}")
        if status == cp_model.OPTIMAL:
            print("Found optimal solution!")
        elif status == cp_model.FEASIBLE:
            print("Found a feasible solution!")
        elif status == cp_model.INFEASIBLE:
            print("Problem is infeasible!")
            # Try to identify which constraints are causing infeasibility
            print("Debugging infeasibility...")
            # In a real solver, you could use self.model.AnalyzeInfeasibility()
        elif status == cp_model.MODEL_INVALID:
            print("Model is invalid!")
        else:
            print(f"Solver ended with status: {status}")
        
        results = {}
        results['status'] = status
        results['assignments'] = {}
        results['summary'] = {}
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            # Build day assignments
            for d in range(self.num_days):
                assigned = [self.doctors[i][0] for i in range(self.num_doctors) 
                           if self.solver.Value(self.shift[(d, i)])]
                dow = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"][self.day_of_week[d]]
                results['assignments'][d] = {
                    'day': d + 1,
                    'day_type': self.day_type[d],
                    'day_of_week': dow,
                    'assigned_doctors': assigned
                }
            
            # Build doctor summary
            for i in range(self.num_doctors):
                wd = sum(self.solver.Value(self.shift[(d, i)]) for d in self.weekday_days)
                sa = sum(self.solver.Value(self.shift[(d, i)]) for d in self.saturday_days)
                su = sum(self.solver.Value(self.shift[(d, i)]) for d in self.sun_hol_days)
                tt = sum(self.solver.Value(self.shift[(d, i)]) for d in range(self.num_days))
                results['summary'][self.doctors[i][0]] = {
                    'weekdays': wd,
                    'saturdays': sa,
                    'sundays_holidays': su,
                    'total': tt
                }
        
        return results
        
    def print_results(self, results):
        """Prints the results in a readable format."""
        if results['status'] == cp_model.OPTIMAL or results['status'] == cp_model.FEASIBLE:
            for d in range(self.num_days):
                assignment = results['assignments'][d]
                print(f"Day {assignment['day']} ({assignment['day_type']}, {assignment['day_of_week']}): {', '.join(assignment['assigned_doctors'])}")
            
            print("\n--- Summary per doctor ---")
            for doctor, stats in results['summary'].items():
                print(f"{doctor} -> WD:{stats['weekdays']} SA:{stats['saturdays']} SU:{stats['sundays_holidays']} TOT:{stats['total']}")
        else:
            print("No solution found.")
            
    def validate_schedule(self, schedule):
        """
        Validates an existing schedule against the constraints.
        
        Args:
            schedule: A dictionary mapping day indices to lists of doctor indices who are assigned
                      to that day. For example: {0: [1, 5], 1: [0, 3], ...}
                      
        Returns:
            A dictionary with:
            - 'valid': boolean indicating if schedule is valid
            - 'violations': list of constraint violations found
        """
        # Setup the data structures
        self.setup_default_data()
        self.setup_day_types()
        self.setup_surgery_days()
        self.calculate_day_categories()
        
        violations = []
        
        # Convert schedule to binary shift format for easier validation
        shift_val = {}
        for d in range(self.num_days):
            for i in range(self.num_doctors):
                shift_val[(d, i)] = 1 if i in schedule.get(d, []) else 0
        
        # Check basic staffing constraints
        for d in range(self.num_days):
            assigned_doctors = sum(shift_val[(d, i)] for i in range(self.num_doctors))
            
            # Check minimum and maximum doctors
            if self.day_type[d] in ["general", "post-general"]:
                min_doctors, max_doctors = 2, 3
            else:
                min_doctors, max_doctors = 2, 2
            
            if assigned_doctors < min_doctors:
                violations.append(f"Day {d+1}: Not enough doctors assigned ({assigned_doctors} < {min_doctors})")
            
            if assigned_doctors > max_doctors:
                violations.append(f"Day {d+1}: Too many doctors assigned ({assigned_doctors} > {max_doctors})")
            
            # At least one senior doctor
            senior_assigned = any(shift_val[(d, i)] for i, doc in enumerate(self.doctors) if doc[1])
            if not senior_assigned:
                violations.append(f"Day {d+1}: No senior doctor assigned")
            
            # No new residents on post-general days
            if self.day_type[d] == "post-general":
                new_residents = [i for i, doc in enumerate(self.doctors) if doc[4]]
                if any(shift_val[(d, i)] for i in new_residents):
                    violations.append(f"Day {d+1}: New resident assigned to post-general day")
        
        # Check no consecutive days
        for i in range(self.num_doctors):
            for d in range(self.num_days - 1):
                if shift_val[(d, i)] and shift_val[(d + 1, i)]:
                    violations.append(f"{self.doctors[i][0]}: Assigned consecutive days ({d+1} and {d+2})")
        
        # Check rotation rules
        for i, (name, _, _, rot, _, abroad, _) in enumerate(self.doctors):
            # Outside rotation (max 3 shifts)
            if rot == 'outside':
                total = sum(shift_val[(d, i)] for d in range(self.num_days))
                if total > 3:
                    violations.append(f"{name}: Exceeds max 3 shifts for outside rotation ({total})")
            
            # KX rotation (no shifts before KX surgery days)
            if rot == 'KX':
                for d in self.KX_surgery_days:
                    prev = d - 1
                    if prev >= 0 and shift_val[(prev, i)]:
                        violations.append(f"{name}: Assigned day before KX surgery day {d+1}")
            
            # TX rotation (no shifts before TX surgery days)
            if rot == 'TX':
                for d in self.TX_surgery_days:
                    prev = d - 1
                    if prev >= 0 and shift_val[(prev, i)]:
                        violations.append(f"{name}: Assigned day before TX surgery day {d+1}")
        
        # Check max shifts constraint
        for i, (name, _, max_shifts, _, _, _, _) in enumerate(self.doctors):
            total = sum(shift_val[(d, i)] for d in range(self.num_days))
            if total > max_shifts:
                violations.append(f"{name}: Exceeds maximum shifts ({total} > {max_shifts})")
        
        # Check fairness targets (these are soft constraints, but we report deviations)
        for i, (name, _, _, _, _, _, _) in enumerate(self.doctors):
            wd = sum(shift_val[(d, i)] for d in self.weekday_days)
            sat = sum(shift_val[(d, i)] for d in self.saturday_days)
            sh = sum(shift_val[(d, i)] for d in self.sun_hol_days)
            
            if sat > 2:
                violations.append(f"{name}: Too many Saturday shifts ({sat} > 2)")
            if sh > 2:
                violations.append(f"{name}: Too many Sunday/Holiday shifts ({sh} > 2)")
            
            # Report significant deviations from targets
            if abs(wd - self.target_weekdays) > 2:
                violations.append(f"{name}: Weekday shifts significantly off target ({wd} vs {self.target_weekdays})")
            if abs(sat - self.target_sat) > 1:
                violations.append(f"{name}: Saturday shifts significantly off target ({sat} vs {self.target_sat})")
            if abs(sh - self.target_sun_hol) > 1:
                violations.append(f"{name}: Sunday/Holiday shifts significantly off target ({sh} vs {self.target_sun_hol})")
        
        return {
            'valid': len(violations) == 0,
            'violations': violations
        }


# Example usage of the solver class
# if __name__ == "__main__":
#     solver = SchedulingSolver()
    
#     # Uncomment this section to solve and generate a schedule
#     results = solver.solve()
#     solver.print_results(results)

    # example_schedule = {
    #     0: [0, 2],
    #     1: [1, 3],
    #     2: [4, 5],
    #     3: [0, 6],
    #     # ... more days would be defined here
    # }
    
    # # Uncomment this section to validate the example schedule
    # validation_result = solver.validate_schedule(example_schedule)
    # print("\n--- Schedule Validation Results ---")
    # print(f"Valid: {validation_result['valid']}")
    # if not validation_result['valid']:
    #     print("Violations:")
    #     for violation in validation_result['violations']:
    #         print(f"- {violation}")

