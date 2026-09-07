export type InvestmentPositionSummary = {
  id: string;
  assetType: string;
  amount: number;
  currentPrice: number;
  exposure: number;
  exposureCurrency: string;
};

export interface InvestmentPositionGateway {
  listPositions(): Promise<InvestmentPositionSummary[]>;
}