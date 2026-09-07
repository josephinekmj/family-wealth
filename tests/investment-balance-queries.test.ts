import { describe, expect, it, vi } from "vitest";
import {
  createInvestmentBalanceQueries,
  type InvestmentBalanceGateway,
  type InvestmentBalanceSummary,
} from "../src/application/index.js";

describe("investment balance queries", () => {
  it("delegates to the gateway and returns its result", async () => {
    const balance: InvestmentBalanceSummary = {
      currency: "DKK",
      cashBalance: 50_000,
      totalValue: 100_000,
    };
    const getBalance = vi.fn(async () => balance);
    const gateway: InvestmentBalanceGateway = { getBalance };

    await expect(createInvestmentBalanceQueries(gateway).getInvestmentBalance()).resolves.toBe(
      balance,
    );
    expect(getBalance).toHaveBeenCalledExactlyOnceWith();
  });

  it("propagates gateway failures", async () => {
    const error = new Error("Balance lookup failed");
    const gateway: InvestmentBalanceGateway = {
      getBalance: async () => {
        throw error;
      },
    };

    await expect(createInvestmentBalanceQueries(gateway).getInvestmentBalance()).rejects.toBe(
      error,
    );
  });
});