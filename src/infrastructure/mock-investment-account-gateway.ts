import type {
  InvestmentAccountGateway,
  InvestmentAccountSummary,
} from "../application/investment-account-contracts.js";

export class MockInvestmentAccountGateway implements InvestmentAccountGateway {
  private readonly accounts: InvestmentAccountSummary[];

  constructor(seedData: InvestmentAccountSummary[] = []) {
    this.accounts = seedData.map((account) => ({ ...account }));
  }

  async listAccounts(): Promise<InvestmentAccountSummary[]> {
    return this.accounts.map((account) => ({ ...account }));
  }
}
