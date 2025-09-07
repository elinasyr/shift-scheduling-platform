
# 
from ortools.sat.python import cp_model
import calendar

# --------------------
# Parameters / Data
# --------------------
num_days = 30
num_doctors = 13

# Γιατροί: κάθε tuple = (όνομα, είναι_μεγάλος, max_shifts, rotation, is_new, abroad, visiting)
# rotation: None | 'outside' | 'KX' | 'TX'
# is_new: True αν ο ειδικευόμενος είναι νέος
# abroad: True αν έχει άσκηση εξωτερικού (κανόνας ι)
# visiting: True αν είναι εμβολίμος (κανόνας Ια)
doctors = []
for i in range(num_doctors):
    if i < 3:
        rot = 'outside'
    elif 3 <= i < 7:
        rot = 'KX'
    elif 7 <= i < 11:
        rot = 'TX'
    else:
        rot = None
    is_new = (i >= 11)
    abroad = (i == 0)  # πχ doctor_0 ασκείται στο εξωτερικό
    visiting = (i == 1)  # πχ doctor_1 είναι εμβολίμος
    doctors.append((f"Doctor_{i}", (i % 3 == 0), 8, rot, is_new, abroad, visiting))

# Labels ημερών
day_type = []
for d in range(num_days):
    if d % 4 == 0:
        day_type.append("general")
    elif (d - 1) % 4 == 0:
        day_type.append("pre-general")
    elif (d + 1) % 4 == 0:
        day_type.append("post-general")
    else:
        day_type.append("normal")

# Ημέρες εβδομάδας
day_of_week = [(d % 7) for d in range(num_days)]
public_holidays = set()
availability = {i: {d: True for d in range(num_days)} for i in range(num_doctors)}

# Surgery schedules
KX_surgery_days = {d for d in range(num_days) if day_of_week[d] in {0, 2, 4}}
TX_surgery_days = {d for d in range(num_days) if day_of_week[d] in {1, 3}}

# --------------------
# Model
# --------------------
model = cp_model.CpModel()
shift = {}
for d in range(num_days):
    for i in range(num_doctors):
        shift[(d, i)] = model.NewBoolVar(f"shift_d{d}_i{i}")

# --------------------
# Hard constraints
# --------------------
for d in range(num_days):
    if day_type[d] == "general":
        min_doctors, max_doctors = 2, 3
    elif day_type[d] == "post-general":
        min_doctors, max_doctors = 2, 3
    else:
        min_doctors, max_doctors = 2, 2

    model.Add(sum(shift[(d, i)] for i in range(num_doctors)) >= min_doctors)
    model.Add(sum(shift[(d, i)] for i in range(num_doctors)) <= max_doctors)

    # Τουλάχιστον ένας μεγάλος
    big_residents = [shift[(d, i)] for i, doc in enumerate(doctors) if doc[1]]
    if big_residents:
        model.Add(sum(big_residents) >= 1)

    # Νέοι ειδικευόμενοι
    new_residents = [i for i, doc in enumerate(doctors) if doc[4]]
    if day_type[d] == "post-general":
        for i in new_residents:
            model.Add(shift[(d, i)] == 0)

    # # Άσκηση στο εξωτερικό (ι)
    # abroad_residents = [i for i, doc in enumerate(doctors) if doc[5]]
    # for i in abroad_residents:
    #     model.Add(shift[(d, i)] == 0)

    # # Εμβολίμοι (Ια) δεν μπαίνουν σε ΜΤΧ (δεν αφορά εδώ, αλλά περιορίζουμε για simplicity)
    # visiting_residents = [i for i, doc in enumerate(doctors) if doc[6]]
    # # Μπορείς να προσθέσεις rules για να μην τους δίνεις ειδικές βάρδιες αργότερα

# Κανένας δεν κάνει 2 μέρες συνεχόμενες
for i in range(num_doctors):
    for d in range(num_days - 1):
        model.Add(shift[(d, i)] + shift[(d + 1, i)] <= 1)

# Rotations
for i, (_, _, max_shifts, rot, _, _, _) in enumerate(doctors):
    if rot == 'outside':
        model.Add(sum(shift[(d, i)] for d in range(num_days)) == 3)
    if rot == 'KX':
        for d in KX_surgery_days:
            prev = d - 1
            if prev >= 0:
                model.Add(shift[(prev, i)] == 0)
    if rot == 'TX':
        for d in TX_surgery_days:
            prev = d - 1
            if prev >= 0:
                model.Add(shift[(prev, i)] == 0)

# Max shifts
for i, (_, _, max_shifts, _, _, _, _) in enumerate(doctors):
    model.Add(sum(shift[(d, i)] for d in range(num_days)) <= max_shifts)

# Total shifts α
min_total_shifts = 2 * num_days
max_total_shifts = 3 * num_days
model.Add(sum(shift[(d, i)] for d in range(num_days) for i in range(num_doctors)) >= min_total_shifts)
model.Add(sum(shift[(d, i)] for d in range(num_days) for i in range(num_doctors)) <= max_total_shifts)

# --------------------
# Soft constraints / fairness
# --------------------
TARGET_WEEKDAYS = 5
TARGET_SAT = 1
TARGET_SUN_HOL = 1
TARGET_TOTAL = 7
weekday_days = [d for d in range(num_days) if day_of_week[d] in {0,1,2,3,4} and d not in public_holidays]
saturday_days = [d for d in range(num_days) if day_of_week[d] == 5]
sun_hol_days = [d for d in range(num_days) if day_of_week[d] == 6 or d in public_holidays]

def add_deviation(model, expr, target, name_prefix):
    dev_pos = model.NewIntVar(0, 100, name_prefix + "_pos")
    dev_neg = model.NewIntVar(0, 100, name_prefix + "_neg")
    model.Add(expr - target == dev_pos - dev_neg)
    return dev_pos, dev_neg

penalties = []
for i in range(num_doctors):
    wd_sum = sum(shift[(d, i)] for d in weekday_days)
    sat_sum = sum(shift[(d, i)] for d in saturday_days)
    sh_sum = sum(shift[(d, i)] for d in sun_hol_days)
    total_sum = sum(shift[(d, i)] for d in range(num_days))

    model.Add(sat_sum <= 2)
    model.Add(sh_sum <= 2)

    wd_pos, wd_neg = add_deviation(model, wd_sum, TARGET_WEEKDAYS, f"i{i}_wd")
    sat_pos, sat_neg = add_deviation(model, sat_sum, TARGET_SAT, f"i{i}_sat")
    sh_pos, sh_neg = add_deviation(model, sh_sum, TARGET_SUN_HOL, f"i{i}_sh")
    tt_pos, tt_neg = add_deviation(model, total_sum, TARGET_TOTAL, f"i{i}_tot")

    penalties.extend([wd_pos*2, wd_neg*2, sat_pos*6, sat_neg*4, sh_pos*7, sh_neg*5, tt_pos*8, tt_neg*8])

# Optional soft: προτιμούμε 3 άτομα στις general/post-general
for d in range(num_days):
    if day_type[d] in {"general", "post-general"}:
        staff = sum(shift[(d, i)] for i in range(num_doctors))
        devp = model.NewIntVar(0, 3, f"d{d}_staff_devp")
        devn = model.NewIntVar(0, 3, f"d{d}_staff_devn")
        model.Add(staff - 3 == devp - devn)
        penalties.extend([devp*2, devn*1])

model.Minimize(sum(penalties))

# --------------------
# Solve
# --------------------
solver = cp_model.CpSolver()
solver.parameters.max_time_in_seconds = 60
status = solver.Solve(model)

if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
    for d in range(num_days):
        assigned = [doctors[i][0] for i in range(num_doctors) if solver.Value(shift[(d, i)])]
        dow = ["Δευ", "Τρι", "Τετ", "Πεμ", "Παρ", "Σαβ", "Κυρ"][day_of_week[d]]
        print(f"Day {d+1} ({day_type[d]}, {dow}): {', '.join(assigned)}")

    print("\n--- Summary per doctor ---")
    for i in range(num_doctors):
        wd = sum(solver.Value(shift[(d, i)]) for d in weekday_days)
        sa = sum(solver.Value(shift[(d, i)]) for d in saturday_days)
        su = sum(solver.Value(shift[(d, i)]) for d in sun_hol_days)
        tt = sum(solver.Value(shift[(d, i)]) for d in range(num_days))
        print(f"{doctors[i][0]} -> WD:{wd} SA:{sa} SU:{su} TOT:{tt}")

else:
    print("No solution found.")
