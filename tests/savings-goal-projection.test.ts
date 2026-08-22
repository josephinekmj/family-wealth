import { describe, expect, it } from "vitest";
import type { SavingsGoalRecord } from "../src/application/savings-goal-contracts.js";
import {
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
