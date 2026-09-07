import type { InvestmentAccountSummary } from "../../application/investment-account-contracts.js";

export type InvestmentConnectionStatus = {
  source: "mock" | "saxo-sim";
  status: "connected" | "not-connected";
};

export async function fetchInvestmentAccounts(): Promise<InvestmentAccountSummary[]> {
  const response = await fetch("/api/investment-accounts");

  if (!response.ok) {
    throw new Error(`Could not load investment accounts (${response.status})`);
  }

  return (await response.json()) as InvestmentAccountSummary[];
}

export async function fetchInvestmentConnectionStatus(): Promise<InvestmentConnectionStatus> {
  const response = await fetch("/api/investment-accounts/status");

  if (!response.ok) {
    throw new Error(`Could not load investment connection status (${response.status})`);
  }

  const value: unknown = await response.json();
  if (
    typeof value !== "object" ||
    value === null ||
    !("source" in value) ||
    !("status" in value) ||
    (value.source !== "mock" && value.source !== "saxo-sim") ||
    (value.status !== "connected" && value.status !== "not-connected")
  ) {
    throw new Error("Could not load investment connection status");
  }

  return { source: value.source, status: value.status };
}
