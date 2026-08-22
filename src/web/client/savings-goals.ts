import type { SavingsGoalRecord } from "../../application/savings-goal-contracts.js";

export async function fetchSavingsGoals(): Promise<SavingsGoalRecord[]> {
  const response = await fetch("/api/goals");

  if (!response.ok) {
    throw new Error(`Could not load savings goals (${response.status})`);
  }

  return (await response.json()) as SavingsGoalRecord[];
}
