import type {
  InvestmentPositionGateway,
  InvestmentPositionSummary,
} from "../application/investment-position-contracts.js";

export class MockInvestmentPositionGateway implements InvestmentPositionGateway {
  private readonly positions: InvestmentPositionSummary[];

  constructor(
    positions: InvestmentPositionSummary[] = [
      {
        id: "mock-position-1",
        assetType: "Stock",
        amount: 10,
        currentPrice: 100,
        exposure: 1_000,
        exposureCurrency: "DKK",
      },
    ],
  ) {
    this.positions = positions.map((position) => ({ ...position }));
  }

  async listPositions(): Promise<InvestmentPositionSummary[]> {
    return this.positions.map((position) => ({ ...position }));
  }
}