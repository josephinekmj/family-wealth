import { describe, expect, it } from "vitest";
import type { InvestmentBalanceGateway } from "../src/application/index.js";
import { buildServer } from "../src/server/app.js";

describe("GET /api/investment-balance", () => {
  it("returns the deterministic mock balance by default", async () => {
    const app = buildServer();

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-balance" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        currency: "DKK",
        cashBalance: 50_000,
        totalValue: 100_000,
      });
    } finally {
      await app.close();
    }
  });

  it("returns only the three provider-neutral fields", async () => {
    const investmentBalanceGateway = {
      getBalance: async () => ({
        currency: "EUR",
        cashBalance: 12_345.67,
        totalValue: 23_456.78,
        token: "must-not-leak",
        AccountKey: "must-not-leak",
      }),
    } satisfies InvestmentBalanceGateway;
    const app = buildServer({ investmentBalanceGateway });

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-balance" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        currency: "EUR",
        cashBalance: 12_345.67,
        totalValue: 23_456.78,
      });
      expect(response.body).not.toMatch(/token|AccountKey|must-not-leak/);
    } finally {
      await app.close();
    }
  });

  it("returns a generic service-unavailable response when the gateway fails", async () => {
    const investmentBalanceGateway: InvestmentBalanceGateway = {
      getBalance: async () => {
        throw new Error("sensitive-token-and-provider-detail");
      },
    };
    const app = buildServer({ investmentBalanceGateway });

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-balance" });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ error: "Investment balance is not available" });
      expect(response.body).not.toContain("sensitive-token-and-provider-detail");
    } finally {
      await app.close();
    }
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)("does not expose %s", async (method) => {
    const app = buildServer();

    try {
      expect(
        (await app.inject({ method, url: "/api/investment-balance" })).statusCode,
      ).toBe(404);
    } finally {
      await app.close();
    }
  });
});