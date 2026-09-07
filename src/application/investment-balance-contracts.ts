export type InvestmentBalanceSummary = {
  currency: string;
  cashBalance: number;
  totalValue: number;
};

export interface InvestmentBalanceGateway {
  getBalance(): Promise<InvestmentBalanceSummary>;
}