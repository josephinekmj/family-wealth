import type { SavingsGoalUpdate } from "./client/savings-goals.js";

type SavingsGoalFormValues = {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  expectedReturnPercent: string;
};

export function parseSavingsGoalForm(values: SavingsGoalFormValues): SavingsGoalUpdate | null {
  const targetAmount = parseFiniteNumber(values.targetAmount);
  const currentAmount = parseFiniteNumber(values.currentAmount);
  const expectedReturnPercent = parseFiniteNumber(values.expectedReturnPercent);

  if (
    values.name.trim().length === 0 ||
    targetAmount === null ||
    targetAmount <= 0 ||
    currentAmount === null ||
    currentAmount < 0 ||
    expectedReturnPercent === null ||
    expectedReturnPercent <= -100 ||
    !isDateInputValue(values.targetDate)
  ) {
    return null;
  }

  return {
    name: values.name.trim(),
    targetAmount,
    currentAmount,
    targetDate: `${values.targetDate}T00:00:00.000Z`,
    expectedAnnualReturn: expectedReturnPercent / 100,
  };
}

export function toDateInputValue(isoDate: string): string {
  return isoDate.slice(0, 10);
}

export function toPercentValue(decimalReturn: number): number {
  return decimalReturn * 100;
}

function parseFiniteNumber(value: string): number | null {
  if (value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

function isDateInputValue(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));
}
