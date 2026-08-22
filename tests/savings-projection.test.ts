import { describe, expect, it } from "vitest";
import { calculateSavingsProjection } from "../src/domain/savings-projection.js";

describe("calculateSavingsProjection", () => {
  it("calculates 0 percent return projection", () => {
    const result = calculateSavingsProjection({
      currentAmount: 0,
      targetAmount: 12000,
      targetDate: new Date("2027-01-01T00:00:00.000Z"),
      expectedAnnualReturn: 0,
      asOfDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result).toEqual({
      monthsRemaining: 12,
      requiredMonthlyContribution: 1000,
      projectedValue: 12000,
    });
  });

  it("requires less monthly contribution with positive return", () => {
    const result = calculateSavingsProjection({
      currentAmount: 0,
      targetAmount: 12000,
      targetDate: new Date("2027-01-01T00:00:00.000Z"),
      expectedAnnualReturn: 0.06,
      asOfDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.monthsRemaining).toBe(12);
    expect(result.requiredMonthlyContribution).toBeGreaterThan(0);
    expect(result.requiredMonthlyContribution).toBeLessThan(1000);
    expect(result.projectedValue).toBeGreaterThanOrEqual(12000);
    expect(result.projectedValue).toBeLessThanOrEqual(12001);
  });

  it("returns zero contribution when goal is already funded", () => {
    const result = calculateSavingsProjection({
      currentAmount: 45000,
      targetAmount: 40000,
      targetDate: new Date("2027-01-01T00:00:00.000Z"),
      expectedAnnualReturn: 0.05,
      asOfDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.requiredMonthlyContribution).toBe(0);
    expect(result.projectedValue).toBeGreaterThan(45000);
  });

  it("throws for target date in the past when goal is unfunded", () => {
    expect(() =>
      calculateSavingsProjection({
        currentAmount: 1000,
        targetAmount: 5000,
        targetDate: new Date("2026-05-01T00:00:00.000Z"),
        expectedAnnualReturn: 0,
        asOfDate: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ).toThrow(/future/i);
  });

  it("handles current amount greater than target", () => {
    const result = calculateSavingsProjection({
      currentAmount: 50000,
      targetAmount: 30000,
      targetDate: new Date("2027-03-01T00:00:00.000Z"),
      expectedAnnualReturn: 0,
      asOfDate: new Date("2026-03-01T00:00:00.000Z"),
    });

    expect(result.requiredMonthlyContribution).toBe(0);
    expect(result.projectedValue).toBeGreaterThanOrEqual(50000);
  });

  it("supports one month remaining", () => {
    const result = calculateSavingsProjection({
      currentAmount: 1000,
      targetAmount: 2000,
      targetDate: new Date("2026-02-15T00:00:00.000Z"),
      expectedAnnualReturn: 0,
      asOfDate: new Date("2026-01-15T00:00:00.000Z"),
    });

    expect(result).toEqual({
      monthsRemaining: 1,
      requiredMonthlyContribution: 1000,
      projectedValue: 2000,
    });
  });

  it("rounds monthly contribution up to cents", () => {
    const result = calculateSavingsProjection({
      currentAmount: 0,
      targetAmount: 1000,
      targetDate: new Date("2026-04-01T00:00:00.000Z"),
      expectedAnnualReturn: 0,
      asOfDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.monthsRemaining).toBe(3);
    expect(result.requiredMonthlyContribution).toBe(333.34);
    expect(result.projectedValue).toBe(1000.02);
  });

  it("throws for invalid values", () => {
    const validBaseInput = {
      currentAmount: 0,
      targetAmount: 1000,
      targetDate: new Date("2026-12-01T00:00:00.000Z"),
      expectedAnnualReturn: 0,
      asOfDate: new Date("2026-01-01T00:00:00.000Z"),
    };

    expect(() =>
      calculateSavingsProjection({
        ...validBaseInput,
        currentAmount: -1,
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateSavingsProjection({
        ...validBaseInput,
        targetAmount: -1,
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateSavingsProjection({
        ...validBaseInput,
        expectedAnnualReturn: -1,
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateSavingsProjection({
        ...validBaseInput,
        expectedAnnualReturn: Number.NaN,
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateSavingsProjection({
        ...validBaseInput,
        targetDate: new Date("invalid"),
      }),
    ).toThrow(RangeError);

    expect(() =>
      calculateSavingsProjection({
        ...validBaseInput,
        asOfDate: new Date("invalid"),
      }),
    ).toThrow(RangeError);
  });
});