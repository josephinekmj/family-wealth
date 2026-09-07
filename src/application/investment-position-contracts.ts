export type InvestmentPositionSummary = {
  id: string;
  instrumentName: string | null;
  symbol: string | null;
  assetType: string;
  amount: number;
  currentPrice: number;
  exposure: number;
  exposureCurrency: string;
};

export interface InvestmentPositionGateway {
  listPositions(): Promise<InvestmentPositionSummary[]>;
}