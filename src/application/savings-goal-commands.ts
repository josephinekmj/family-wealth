import {
  type SavingsGoalProfile,
  type SavingsGoalRepository,
} from "./savings-goal-contracts.js";

export type SavingsGoalCommands = {
  saveSavingsGoal(goal: SavingsGoalProfile): Promise<void>;
};

export function createSavingsGoalCommands(
  savingsGoalRepository: SavingsGoalRepository,
): SavingsGoalCommands {
  return {
    async saveSavingsGoal(goal: SavingsGoalProfile): Promise<void> {
      validateSavingsGoalProfile(goal);
      await savingsGoalRepository.save(goal);
    },
  };
}

function validateSavingsGoalProfile(goal: SavingsGoalProfile): void {
  const trimmedId = goal.goal.id.trim();
  if (trimmedId.length === 0) {
    throw new RangeError("id must be non-empty.");
  }

  const trimmedName = goal.goal.name.trim();
  if (trimmedName.length === 0) {
    throw new RangeError("name must be non-empty.");
  }

  assertFinitePositive("targetAmount", goal.goal.targetAmount);
  assertFiniteNonNegative("currentAmount", goal.goal.currentAmount);
  assertValidDate("targetDate", goal.goal.targetDate);

  if (!Number.isFinite(goal.expectedAnnualReturn)) {
    throw new RangeError("expectedAnnualReturn must be a finite number.");
  }

  if (goal.expectedAnnualReturn <= -1) {
    throw new RangeError("expectedAnnualReturn must be greater than -1.");
  }
}

function assertFinitePositive(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }

  if (value <= 0) {
    throw new RangeError(`${name} must be greater than 0.`);
  }
}

function assertFiniteNonNegative(name: string, value: number): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number.`);
  }

  if (value < 0) {
    throw new RangeError(`${name} must be non-negative.`);
  }
}

function assertValidDate(name: string, value: Date): void {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new RangeError(`${name} must be a valid Date.`);
  }
}