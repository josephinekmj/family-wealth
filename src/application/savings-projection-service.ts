import {
  calculateSavingsProjection,
  type SavingsProjection,
  type SavingsProjectionInput,
} from "../domain/savings-projection.js";

export type SavingsProjectionRequest = Omit<SavingsProjectionInput, "asOfDate"> & {
  asOfDate?: Date;
};

export type SavingsProjectionService = {
  calculate(request: SavingsProjectionRequest): SavingsProjection;
};

export type NowProvider = () => Date;

export function createSavingsProjectionService(
  nowProvider: NowProvider = () => new Date(),
): SavingsProjectionService {
  return {
    calculate(request: SavingsProjectionRequest): SavingsProjection {
      return calculateSavingsProjection({
        ...request,
        asOfDate: request.asOfDate ?? nowProvider(),
      });
    },
  };
}