import { describe, expect, it } from "vitest";
import {
  mapRecordToSavingsGoalProfile,
  mapSavingsGoalProfileToRecord,
  type SavingsGoalRecord,
} from "../src/application/savings-goal-contracts.js";

describe("savings goal contracts", () => {
  it("maps record to profile", () => {
    const record: SavingsGoalRecord = {
      id: "goal-1",
      name: "Konfirmation 2019",
      targetAmount: 40000,
      currentAmount: 3000,
      targetDate: "2029-05-01T00:00:00.000Z",
      expectedAnnualReturn: 0.05,
    };

    const profile = mapRecordToSavingsGoalProfile(record);

    expect(profile.goal.id).toBe("goal-1");
    expect(profile.goal.name).toBe("Konfirmation 2019");
    expect(profile.goal.targetAmount).toBe(40000);
    expect(profile.goal.currentAmount).toBe(3000);
    expect(profile.goal.targetDate.toISOString()).toBe("2029-05-01T00:00:00.000Z");
    expect(profile.expectedAnnualReturn).toBe(0.05);
  });

  it("maps profile to record", () => {
    const record = mapSavingsGoalProfileToRecord({
      goal: {
        id: "goal-2",
        name: "Konfirmation 2021",
        targetAmount: 50000,
        currentAmount: 5000,
        targetDate: new Date("2031-05-01T00:00:00.000Z"),
      },
      expectedAnnualReturn: 0.07,
    });

    expect(record).toEqual({
      id: "goal-2",
      name: "Konfirmation 2021",
      targetAmount: 50000,
      currentAmount: 5000,
      targetDate: "2031-05-01T00:00:00.000Z",
      expectedAnnualReturn: 0.07,
    });
  });

  it("roundtrips without losing semantics", () => {
    const original: SavingsGoalRecord = {
      id: "goal-3",
      name: "Konfirmation",
      targetAmount: 35000,
      currentAmount: 4200,
      targetDate: "2030-10-15T00:00:00.000Z",
      expectedAnnualReturn: 0.04,
    };

    const profile = mapRecordToSavingsGoalProfile(original);
    const remapped = mapSavingsGoalProfileToRecord(profile);

    expect(remapped).toEqual(original);
  });

  it("throws for invalid target date in record", () => {
    const invalid: SavingsGoalRecord = {
      id: "goal-4",
      name: "Broken Date",
      targetAmount: 10000,
      currentAmount: 1000,
      targetDate: "not-a-date",
      expectedAnnualReturn: 0.03,
    };

    expect(() => mapRecordToSavingsGoalProfile(invalid)).toThrow(RangeError);
  });
});