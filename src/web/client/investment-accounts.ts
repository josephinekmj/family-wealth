import type { InvestmentAccountSummary } from "../../application/investment-account-contracts.js";

export async function fetchInvestmentAccounts(): Promise<InvestmentAccountSummary[]> {
  const response = await fetch("/api/investment-accounts");

  if (!response.ok) {
    throw new Error(`Could not load investment accounts (${response.status})`);
  }

  return (await response.json()) as InvestmentAccountSummary[];
}
