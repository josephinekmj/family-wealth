import {
  type SavingsGoalProfile,
  type SavingsGoalRepository,
} from "./savings-goal-contracts.js";

export type SavingsGoalQueries = {
  listSavingsGoals(): Promise<SavingsGoalProfile[]>;
};

export function createSavingsGoalQueries(
  savingsGoalRepository: SavingsGoalRepository,
): SavingsGoalQueries {
  return {
    async listSavingsGoals(): Promise<SavingsGoalProfile[]> {
      return savingsGoalRepository.findAll();
    },
  };
}