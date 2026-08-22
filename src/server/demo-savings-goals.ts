import type { SavingsGoalProfile } from "../application/savings-goal-contracts.js";

// Demo-only seed data for local development in the in-memory repository.
export const DEMO_SAVINGS_GOALS: SavingsGoalProfile[] = [
  {
    goal: {
      id: "confirmation-2019",
      name: "Confirmation 2019",
      targetAmount: 40000,
      currentAmount: 0,
      targetDate: new Date("2033-05-01T00:00:00.000Z"),
    },
    expectedAnnualReturn: 0.04,
  },
  {
    goal: {
      id: "confirmation-2021",
      name: "Confirmation 2021",
      targetAmount: 40000,
      currentAmount: 1000,
      targetDate: new Date("2035-05-01T00:00:00.000Z"),
    },
    expectedAnnualReturn: 0.05,
  },
];