import type {
  InvestmentAccountGateway,
  InvestmentAccountSummary,
} from "./investment-account-contracts.js";

export type InvestmentAccountQueries = {
  listInvestmentAccounts(): Promise<InvestmentAccountSummary[]>;
};

export function createInvestmentAccountQueries(
  gateway: InvestmentAccountGateway,
): InvestmentAccountQueries {
  return {
    async listInvestmentAccounts(): Promise<InvestmentAccountSummary[]> {
      return gateway.listAccounts();
    },
  };
}
