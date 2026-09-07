import type {
  InvestmentBalanceGateway,
  InvestmentBalanceSummary,
} from "../application/investment-balance-contracts.js";

export class MockInvestmentBalanceGateway implements InvestmentBalanceGateway {
  constructor(
    private readonly balance: InvestmentBalanceSummary = {
      currency: "DKK",
      cashBalance: 50_000,
      totalValue: 100_000,
    },
  ) {}

  async getBalance(): Promise<InvestmentBalanceSummary> {
    return { ...this.balance };
  }
}