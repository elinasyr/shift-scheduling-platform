# Doctor Preference-Based Scheduling

This document outlines how the scheduling system takes doctor preferences into account when generating schedules.

## Preference Types

Doctors can mark their availability in three ways:

1. **Available**: Default status, doctor can be scheduled based on normal priority rules
2. **Preferred**: Doctor prefers to work on this day, and will be given highest priority
3. **Unavailable**: Doctor cannot be scheduled on this day

## How Preferences Affect Scheduling

When the automatic schedule generation runs:

1. **Preference Priority**: Doctors who mark a day as "Preferred" receive a significant boost to their priority score (+10 points) for that day
2. **Unavailability Respect**: Doctors who mark themselves as "Unavailable" are completely excluded from scheduling on that day
3. **Workload Balance**: Priority scores are also adjusted based on how many shifts each doctor has been assigned (-1 point per existing shift)
4. **Doctor Assignment**: The doctor with the highest priority score gets assigned to each shift

## Example Scenario

Consider three doctors for a Monday shift:

- **Dr. Smith**: Available (default), has 3 shifts assigned already
- **Dr. Jones**: Preferred this day, has 5 shifts assigned already
- **Dr. Lee**: Available (default), has 2 shifts assigned already

Priority calculation:
- Dr. Smith: 0 (base) - 3 (shifts) = -3
- Dr. Jones: 10 (preferred) - 5 (shifts) = 5
- Dr. Lee: 0 (base) - 2 (shifts) = -2

Result: Dr. Jones would be assigned despite having more shifts because of the preference boost.

## Viewing and Setting Preferences

Doctors can set their preferences using the Doctor Calendar view:

1. Navigate to the Calendar tab
2. Click on a day to cycle through availability options:
   - Green: Available (default)
   - Blue: Preferred
   - Red: Unavailable
3. Changes are saved automatically

## Manager Considerations

While the automatic scheduling system prioritizes doctor preferences, managers may need to override these in certain situations:

1. Hospital staffing requirements
2. Emergency coverage
3. Ensuring fair distribution of weekend/holiday shifts

When a manager overrides the automatic scheduling, they can see if they're contradicting a doctor's preference.
