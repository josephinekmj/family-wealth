import { describe, expect, it } from "vitest";
import { createSavingsProjectionService } from "../src/application/savings-projection-service.js";
import { calculateSavingsProjection } from "../src/domain/savings-projection.js";

describe("createSavingsProjectionService", () => {
  it("uses explicit asOfDate when provided", () => {
    const service = createSavingsProjectionService(() => new Date("2030-01-01T00:00:00.000Z"));

    const result = service.calculate({
      currentAmount: 0,
      targetAmount: 12000,
      targetDate: new Date("2027-01-01T00:00:00.000Z"),
      expectedAnnualReturn: 0,
      asOfDate: new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(result.monthsRemaining).toBe(12);
    expect(result.requiredMonthlyContribution).toBe(1000);
  });

  it("uses injected now provider when asOfDate is omitted", () => {
    const service = createSavingsProjectionService(() => new Date("2026-01-01T00:00:00.000Z"));

    const result = service.calculate({
      currentAmount: 2000,
      targetAmount: 8000,
      targetDate: new Date("2027-01-01T00:00:00.000Z"),
      expectedAnnualReturn: 0,
    });

    expect(result).toEqual({
      monthsRemaining: 12,
      requiredMonthlyContribution: 500,
      projectedValue: 8000,
    });
  });

  it("matches domain function output for deterministic input", () => {
    const input = {
      currentAmount: 3000,
      targetAmount: 10000,
      targetDate: new Date("2028-01-01T00:00:00.000Z"),
      expectedAnnualReturn: 0.05,
      asOfDate: new Date("2026-01-01T00:00:00.000Z"),
    };
    const service = createSavingsProjectionService(() => new Date("2030-01-01T00:00:00.000Z"));

    const serviceResult = service.calculate(input);
    const domainResult = calculateSavingsProjection(input);

    expect(serviceResult).toEqual(domainResult);
  });

  it("propagates validation errors from domain", () => {
    const service = createSavingsProjectionService(() => new Date("2026-01-01T00:00:00.000Z"));

    expect(() =>
      service.calculate({
        currentAmount: -1,
        targetAmount: 1000,
        targetDate: new Date("2027-01-01T00:00:00.000Z"),
        expectedAnnualReturn: 0,
      }),
    ).toThrow(RangeError);
  });
});