export type InvestmentAccountSummary = {
  id: string;
  name: string;
  currency: string;
};

export interface InvestmentAccountGateway {
  listAccounts(): Promise<InvestmentAccountSummary[]>;
}
