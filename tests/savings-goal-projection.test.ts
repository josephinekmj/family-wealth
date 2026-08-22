import { describe, expect, it } from "vitest";
import type { SavingsGoalRecord } from "../src/application/savings-goal-contracts.js";
import {
  getCombinedSavingsProjection,
  getSavingsGoalProjection,
  mapSavingsGoalRecordToProjectionRequest,
} from "../src/web/savings-goal-projection.js";

const goal: SavingsGoalRecord = {
  id: "generic-goal",
  name: "Generic goal",
  currentAmount: 2000,
  targetAmount: 8000,
  targetDate: "2027-01-01T00:00:00.000Z",
  expectedAnnualReturn: 0,
};

describe("savings goal projection presentation", () => {
  it("maps a goal record to the existing projection request", () => {
    const asOfDate = new Date("2026-01-01T00:00:00.000Z");

    const request = mapSavingsGoalRecordToProjectionRequest(
      { ...goal, expectedAnnualReturn: 0.0475 },
      asOfDate,
    );

    expect(request).toEqual({
      currentAmount: 2000,
      targetAmount: 8000,
      targetDate: new Date("2027-01-01T00:00:00.000Z"),
      expectedAnnualReturn: 0.0475,
      asOfDate,
    });
  });

  it("calculates a deterministic presentation result", () => {
    const result = getSavingsGoalProjection(goal, new Date("2026-01-01T00:00:00.000Z"));

    expect(result).toEqual({
      status: "available",
      projection: {
        monthsRemaining: 12,
        requiredMonthlyContribution: 500,
        projectedValue: 8000,
      },
    });
  });

  it("returns unavailable for an unprojectable goal", () => {
    const result = getSavingsGoalProjection(
      { ...goal, targetDate: "2025-01-01T00:00:00.000Z" },
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(result).toEqual({ status: "unavailable" });
  });
});

describe("combined savings projection", () => {
  const asOfDate = new Date("2026-01-01T00:00:00.000Z");

  it("sums required monthly contributions for multiple goals", () => {
    const result = getCombinedSavingsProjection(
      [goal, { ...goal, id: "goal-2", currentAmount: 5000 }],
      asOfDate,
    );

    expect(result).toEqual({ status: "available", requiredMonthlyContribution: 750 });
  });

  it("uses the supplied as-of date consistently", () => {
    const records = [goal, { ...goal, id: "goal-2" }];

    expect(getCombinedSavingsProjection(records, asOfDate)).toEqual({
      status: "available",
      requiredMonthlyContribution: 1000,
    });
    expect(getCombinedSavingsProjection(records, new Date("2026-02-01T00:00:00.000Z"))).toEqual({
      status: "available",
      requiredMonthlyContribution: 1090.92,
    });
  });

  it("works for one goal", () => {
    expect(getCombinedSavingsProjection([goal], asOfDate)).toEqual({
      status: "available",
      requiredMonthlyContribution: 500,
    });
  });

  it("is unavailable when any goal is unprojectable", () => {
    const pastGoal = { ...goal, id: "past-goal", targetDate: "2025-01-01T00:00:00.000Z" };

    expect(getCombinedSavingsProjection([goal, pastGoal], asOfDate)).toEqual({
      status: "unavailable",
    });
  });

  it("includes a zero required contribution", () => {
    const fundedGoal = { ...goal, id: "funded-goal", currentAmount: goal.targetAmount };

    expect(getCombinedSavingsProjection([goal, fundedGoal], asOfDate)).toEqual({
      status: "available",
      requiredMonthlyContribution: 500,
    });
  });
});
