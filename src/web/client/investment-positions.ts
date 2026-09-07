import type { InvestmentPositionSummary } from "../../application/investment-position-contracts.js";

export async function fetchInvestmentPositions(): Promise<InvestmentPositionSummary[]> {
  const response = await fetch("/api/investment-positions");

  if (!response.ok) {
    throw new Error(`Could not load investment positions (${response.status})`);
  }

  const value: unknown = await response.json();
  if (!Array.isArray(value)) {
    throw new Error("Could not load investment positions");
  }

  return value as InvestmentPositionSummary[];
}