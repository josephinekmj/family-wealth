import { describe, expect, it } from "vitest";
import { MockInvestmentBalanceGateway } from "../src/infrastructure/mock-investment-balance-gateway.js";

describe("MockInvestmentBalanceGateway", () => {
  it("returns deterministic demo balance by default", async () => {
    await expect(new MockInvestmentBalanceGateway().getBalance()).resolves.toEqual({
      currency: "DKK",
      cashBalance: 50_000,
      totalValue: 100_000,
    });
  });

  it("returns a defensive copy", async () => {
    const gateway = new MockInvestmentBalanceGateway();
    const balance = await gateway.getBalance();
    balance.totalValue = 0;

    await expect(gateway.getBalance()).resolves.toMatchObject({ totalValue: 100_000 });
  });
});