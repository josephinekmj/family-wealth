import { describe, expect, it, vi } from "vitest";
import type { InvestmentAccountGateway } from "../src/application/investment-account-contracts.js";
import { buildServer } from "../src/server/app.js";

describe("GET /api/investment-accounts", () => {
  it("returns HTTP 200 with the generic default mock account", async () => {
    const app = buildServer();

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-accounts" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        { id: "mock-account-1", name: "Investment account", currency: "DKK" },
      ]);
    } finally {
      await app.close();
    }
  });

  it("returns injected gateway data with only the public summary fields", async () => {
    const listAccounts = vi.fn(async () => [
      { id: "mock-account-2", name: "Test account", currency: "EUR", internalNote: "Mock only" },
    ]);
    const investmentAccountGateway: InvestmentAccountGateway = { listAccounts };
    const app = buildServer({ investmentAccountGateway });

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-accounts" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        { id: "mock-account-2", name: "Test account", currency: "EUR" },
      ]);
      expect(listAccounts).toHaveBeenCalledExactlyOnceWith();
    } finally {
      await app.close();
    }
  });

  it("returns an empty array when the injected gateway has no accounts", async () => {
    const investmentAccountGateway: InvestmentAccountGateway = { listAccounts: async () => [] };
    const app = buildServer({ investmentAccountGateway });

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-accounts" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)("does not expose %s", async (method) => {
    const app = buildServer();

    try {
      const response = await app.inject({ method, url: "/api/investment-accounts" });

      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
