import type {
  InvestmentPositionGateway,
  InvestmentPositionSummary,
} from "./investment-position-contracts.js";

export type InvestmentPositionQueries = {
  listInvestmentPositions(): Promise<InvestmentPositionSummary[]>;
};

export function createInvestmentPositionQueries(
  gateway: InvestmentPositionGateway,
): InvestmentPositionQueries {
  return {
    async listInvestmentPositions(): Promise<InvestmentPositionSummary[]> {
      return gateway.listPositions();
    },
  };
}