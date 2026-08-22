import type { SavingsGoal } from "../domain/savings-projection.js";

export type SavingsGoalProfile = {
  goal: SavingsGoal;
  expectedAnnualReturn: number;
};

export type SavingsGoalRecord = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  expectedAnnualReturn: number;
};

export interface SavingsGoalRepository {
  findAll(): Promise<SavingsGoalProfile[]>;
  findById(id: string): Promise<SavingsGoalProfile | null>;
  save(goal: SavingsGoalProfile): Promise<void>;
}

export function mapRecordToSavingsGoalProfile(
  record: SavingsGoalRecord,
): SavingsGoalProfile {
  const targetDate = new Date(record.targetDate);

  if (Number.isNaN(targetDate.getTime())) {
    throw new RangeError("targetDate must be a valid ISO date string.");
  }

  return {
    goal: {
      id: record.id,
      name: record.name,
      targetAmount: record.targetAmount,
      currentAmount: record.currentAmount,
      targetDate,
    },
    expectedAnnualReturn: record.expectedAnnualReturn,
  };
}

export function mapSavingsGoalProfileToRecord(
  profile: SavingsGoalProfile,
): SavingsGoalRecord {
  return {
    id: profile.goal.id,
    name: profile.goal.name,
    targetAmount: profile.goal.targetAmount,
    currentAmount: profile.goal.currentAmount,
    targetDate: profile.goal.targetDate.toISOString(),
    expectedAnnualReturn: profile.expectedAnnualReturn,
  };
}