import type { SavingsGoalRecord } from "../../application/savings-goal-contracts.js";

export type SavingsGoalUpdate = Omit<SavingsGoalRecord, "id">;

export async function fetchSavingsGoals(): Promise<SavingsGoalRecord[]> {
  const response = await fetch("/api/goals");

  if (!response.ok) {
    throw new Error(`Could not load savings goals (${response.status})`);
  }

  return (await response.json()) as SavingsGoalRecord[];
}

export async function updateSavingsGoal(id: string, goal: SavingsGoalUpdate): Promise<void> {
  const response = await fetch(`/api/goals/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(goal),
  });

  if (!response.ok) {
    throw new Error(`Could not save savings goal (${response.status})`);
  }
}
