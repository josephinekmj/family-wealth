import { describe, expect, it } from "vitest";
import type { InvestmentPositionGateway } from "../src/application/index.js";
import { buildServer } from "../src/server/app.js";

describe("GET /api/investment-positions", () => {
  it("returns the deterministic mock position by default", async () => {
    const app = buildServer();

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-positions" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        {
          id: "mock-position-1",
          instrumentName: "Example Company",
          symbol: "EXAMPLE",
          assetType: "Stock",
          amount: 10,
          currentPrice: 100,
          exposure: 1_000,
          exposureCurrency: "DKK",
        },
      ]);
    } finally {
      await app.close();
    }
  });

  it("returns only the eight provider-neutral fields including nullable metadata", async () => {
    const investmentPositionGateway = {
      listPositions: async () => [
        {
          id: "opaque-position",
          instrumentName: null,
          symbol: null,
          assetType: "Stock",
          amount: 2,
          currentPrice: 50,
          exposure: 100,
          exposureCurrency: "EUR",
          PositionId: "must-not-leak",
          Uic: 12345,
        },
      ],
    } satisfies InvestmentPositionGateway;
    const app = buildServer({ investmentPositionGateway });

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-positions" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([
        {
          id: "opaque-position",
          instrumentName: null,
          symbol: null,
          assetType: "Stock",
          amount: 2,
          currentPrice: 50,
          exposure: 100,
          exposureCurrency: "EUR",
        },
      ]);
      expect(response.body).not.toMatch(/PositionId|Uic|must-not-leak/);
    } finally {
      await app.close();
    }
  });

  it("returns an empty array", async () => {
    const app = buildServer({ investmentPositionGateway: { listPositions: async () => [] } });

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-positions" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    } finally {
      await app.close();
    }
  });

  it("returns a generic service-unavailable response when the gateway fails", async () => {
    const investmentPositionGateway: InvestmentPositionGateway = {
      listPositions: async () => {
        throw new Error("sensitive-token-and-position-detail");
      },
    };
    const app = buildServer({ investmentPositionGateway });

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-positions" });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ error: "Investment positions are not available" });
      expect(response.body).not.toContain("sensitive-token-and-position-detail");
    } finally {
      await app.close();
    }
  });

  it.each(["POST", "PUT", "PATCH", "DELETE"] as const)("does not expose %s", async (method) => {
    const app = buildServer();

    try {
      expect(
        (await app.inject({ method, url: "/api/investment-positions" })).statusCode,
      ).toBe(404);
    } finally {
      await app.close();
    }
  });
});