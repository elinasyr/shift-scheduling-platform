import unittest
from ortools.sat.python import cp_model
from rules_or import SchedulingSolver

class TestSchedulingSolver(unittest.TestCase):
    def setUp(self):
        """Initialize a solver instance for each test"""
        self.solver = SchedulingSolver()
        self.solver.setup_default_data()
        self.solver.setup_day_types()
        self.solver.setup_surgery_days()
        self.solver.initialize_model()
        self.solver.add_hard_constraints()
        self.solver.add_consecutive_days_constraint()
        self.solver.add_rotation_rules()
        self.solver.add_max_shifts_constraint()
        self.solver.add_total_shifts_constraint()
        self.solver.calculate_day_categories()
        penalties = self.solver.add_fairness_constraints()
        penalties.extend(self.solver.add_preferred_staffing())
        self.solver.model.Minimize(sum(penalties))
        self.cp_solver = cp_model.CpSolver()
        self.cp_solver.parameters.max_time_in_seconds = 60
        self.status = self.cp_solver.Solve(self.solver.model)

    def test_feasible_solution_exists(self):
        """Check that a feasible solution is found"""
        self.assertIn(self.status, [cp_model.OPTIMAL, cp_model.FEASIBLE], 
                      "Solver did not find a feasible solution")

    def test_no_consecutive_shifts(self):
        """Ensure no doctor works consecutive days"""
        if self.status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for i in range(self.solver.num_doctors):
                for d in range(self.solver.num_days - 1):
                    val_today = self.cp_solver.Value(self.solver.shift[(d,i)])
                    val_next = self.cp_solver.Value(self.solver.shift[(d+1,i)])
                    self.assertFalse(val_today and val_next,
                                     f"Doctor {i} has consecutive shifts on days {d} and {d+1}")

    def test_new_residents_post_general(self):
        """Check new residents do not work post-general days"""
        if self.status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for d in range(self.solver.num_days):
                if self.solver.day_type[d] == "post-general":
                    for i, doc in enumerate(self.solver.doctors):
                        if doc[4]:  # is_new
                            val = self.cp_solver.Value(self.solver.shift[(d,i)])
                            self.assertEqual(val, 0, f"New resident {doc[0]} assigned on post-general day {d}")

    def test_big_residents_present(self):
        """Ensure at least one big (senior) resident per shift"""
        if self.status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for d in range(self.solver.num_days):
                big_residents = [i for i, doc in enumerate(self.solver.doctors) if doc[1]]
                total_big = sum(self.cp_solver.Value(self.solver.shift[(d,i)]) for i in big_residents)
                self.assertGreaterEqual(total_big, 1, f"No senior assigned on day {d}")

    def test_max_shifts_respected(self):
        """Ensure no doctor exceeds their maximum allowed shifts"""
        if self.status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for i, doc in enumerate(self.solver.doctors):
                total_shifts = sum(self.cp_solver.Value(self.solver.shift[(d,i)]) for d in range(self.solver.num_days))
                self.assertLessEqual(total_shifts, doc[2], f"Doctor {doc[0]} exceeds max shifts ({doc[2]})")

    def test_rotations_KX_TX_previous_day(self):
        """Ensure KX/TX doctors do not work the day before surgery"""
        if self.status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for i, doc in enumerate(self.solver.doctors):
                if doc[3] == 'KX':
                    for d in self.solver.KX_surgery_days:
                        prev = d-1
                        if prev >= 0:
                            val = self.cp_solver.Value(self.solver.shift[(prev,i)])
                            self.assertEqual(val, 0, f"KX doctor {doc[0]} assigned day before surgery {prev}")
                if doc[3] == 'TX':
                    for d in self.solver.TX_surgery_days:
                        prev = d-1
                        if prev >= 0:
                            val = self.cp_solver.Value(self.solver.shift[(prev,i)])
                            self.assertEqual(val, 0, f"TX doctor {doc[0]} assigned day before surgery {prev}")

if __name__ == '__main__':
    unittest.main()
