export type SavingsGoal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
};

export type SavingsProjectionInput = {
  currentAmount: number;
  targetAmount: number;
  targetDate: Date;
  expectedAnnualReturn: number;
  asOfDate: Date;
};

export type SavingsProjection = {
  monthsRemaining: number;
  requiredMonthlyContribution: number;
  projectedValue: number;
};

const CURRENCY_FACTOR = 100;

export function calculateSavingsProjection(
  input: SavingsProjectionInput,
): SavingsProjection {
  validateInput(input);

  const { asOfDate, targetDate, currentAmount, targetAmount } = input;

  if (targetDate.getTime() <= asOfDate.getTime()) {
    if (currentAmount >= targetAmount) {
      return {
        monthsRemaining: 0,
        requiredMonthlyContribution: 0,
        projectedValue: roundCurrency(currentAmount),
      };
    }

    throw new RangeError("targetDate must be in the future for an unfunded goal.");
  }

  const monthsRemaining = calculateMonthCount(asOfDate, targetDate);
  const monthlyRate = annualToMonthlyRate(input.expectedAnnualReturn);
  const growthFactor = Math.pow(1 + monthlyRate, monthsRemaining);
  const grownCurrentAmount = currentAmount * growthFactor;

  if (currentAmount >= targetAmount || grownCurrentAmount >= targetAmount) {
    return {
      monthsRemaining,
      requiredMonthlyContribution: 0,
      projectedValue: roundCurrency(grownCurrentAmount),
    };
  }

  const requiredRaw = calculateRequiredMonthlyContribution(
    currentAmount,
    targetAmount,
    monthsRemaining,
    monthlyRate,
  );
  const requiredMonthlyContribution = roundCurrencyUp(requiredRaw);
  const projectedValue = roundCurrency(
    projectFutureValue(
      currentAmount,
      requiredMonthlyContribution,
      monthsRemaining,
      monthlyRate,
    ),
  );

  return {
    monthsRemaining,
    requiredMonthlyContribution,
    projectedValue,
  };
}

function validateInput(input: SavingsProjectionInput): void {
  assertFiniteNonNegative("currentAmount", input.currentAmount);
  assertFiniteNonNegative("targetAmount", input.targetAmount);

  if (!Number.isFinite(input.expectedAnnualReturn)) {
    throw new RangeError("expectedAnnualReturn must be a finite number.");
  }

  if (input.expectedAnnualReturn <= -1) {
    throw new RangeError("expectedAnnualReturn must be greater than -1.");
  }

  assertValidDate("targetDate", input.targetDate);
  assertValidDate("asOfDate", input.asOfDate);
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

function annualToMonthlyRate(annualReturn: number): number {
  if (annualReturn === 0) {
    return 0;
  }

  return Math.pow(1 + annualReturn, 1 / 12) - 1;
}

function calculateMonthCount(asOfDate: Date, targetDate: Date): number {
  let months =
    (targetDate.getUTCFullYear() - asOfDate.getUTCFullYear()) * 12 +
    (targetDate.getUTCMonth() - asOfDate.getUTCMonth());

  const anchorDate = addMonthsUtcClamped(asOfDate, months);
  if (anchorDate.getTime() < targetDate.getTime()) {
    months += 1;
  }

  return Math.max(1, months);
}

function addMonthsUtcClamped(date: Date, monthsToAdd: number): Date {
  const totalMonths =
    date.getUTCFullYear() * 12 +
    date.getUTCMonth() +
    monthsToAdd;
  const month = ((totalMonths % 12) + 12) % 12;
  const year = (totalMonths - month) / 12;
  const maxDayInMonth = daysInUtcMonth(year, month);
  const day = Math.min(date.getUTCDate(), maxDayInMonth);

  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  );
}

function daysInUtcMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function calculateRequiredMonthlyContribution(
  currentAmount: number,
  targetAmount: number,
  monthsRemaining: number,
  monthlyRate: number,
): number {
  if (monthlyRate === 0) {
    return Math.max(0, (targetAmount - currentAmount) / monthsRemaining);
  }

  const growthFactor = Math.pow(1 + monthlyRate, monthsRemaining);
  const annuityFactor = (growthFactor - 1) / monthlyRate;
  const amountGap = targetAmount - currentAmount * growthFactor;

  return Math.max(0, amountGap / annuityFactor);
}

function projectFutureValue(
  currentAmount: number,
  monthlyContribution: number,
  monthsRemaining: number,
  monthlyRate: number,
): number {
  if (monthsRemaining === 0) {
    return currentAmount;
  }

  if (monthlyRate === 0) {
    return currentAmount + monthlyContribution * monthsRemaining;
  }

  const growthFactor = Math.pow(1 + monthlyRate, monthsRemaining);
  const annuityFactor = (growthFactor - 1) / monthlyRate;

  return currentAmount * growthFactor + monthlyContribution * annuityFactor;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * CURRENCY_FACTOR) / CURRENCY_FACTOR;
}

function roundCurrencyUp(value: number): number {
  if (value <= 0) {
    return 0;
  }

  return Math.ceil((value - Number.EPSILON) * CURRENCY_FACTOR) / CURRENCY_FACTOR;
}