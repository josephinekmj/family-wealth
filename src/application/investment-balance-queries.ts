import type {
  InvestmentBalanceGateway,
  InvestmentBalanceSummary,
} from "./investment-balance-contracts.js";

export type InvestmentBalanceQueries = {
  getInvestmentBalance(): Promise<InvestmentBalanceSummary>;
};

export function createInvestmentBalanceQueries(
  gateway: InvestmentBalanceGateway,
): InvestmentBalanceQueries {
  return {
    async getInvestmentBalance(): Promise<InvestmentBalanceSummary> {
      return gateway.getBalance();
    },
  };
}