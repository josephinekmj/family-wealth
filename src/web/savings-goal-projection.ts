import {
  createSavingsProjectionService,
  type SavingsProjectionRequest,
} from "../application/savings-projection-service.js";
import {
  mapRecordToSavingsGoalProfile,
  type SavingsGoalRecord,
} from "../application/savings-goal-contracts.js";
import type { SavingsProjection } from "../domain/savings-projection.js";

export type SavingsGoalProjectionView =
  { status: "available"; projection: SavingsProjection } | { status: "unavailable" };

const projectionService = createSavingsProjectionService();

export function mapSavingsGoalRecordToProjectionRequest(
  record: SavingsGoalRecord,
  asOfDate?: Date,
): SavingsProjectionRequest {
  const profile = mapRecordToSavingsGoalProfile(record);

  return {
    currentAmount: profile.goal.currentAmount,
    targetAmount: profile.goal.targetAmount,
    targetDate: profile.goal.targetDate,
    expectedAnnualReturn: profile.expectedAnnualReturn,
    ...(asOfDate === undefined ? {} : { asOfDate }),
  };
}

export function getSavingsGoalProjection(
  record: SavingsGoalRecord,
  asOfDate?: Date,
): SavingsGoalProjectionView {
  try {
    return {
      status: "available",
      projection: projectionService.calculate(
        mapSavingsGoalRecordToProjectionRequest(record, asOfDate),
      ),
    };
  } catch (error) {
    if (error instanceof RangeError) {
      return { status: "unavailable" };
    }

    throw error;
  }
}
