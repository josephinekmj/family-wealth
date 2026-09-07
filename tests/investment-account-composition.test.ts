import { describe, expect, it, vi } from "vitest";
import { MockInvestmentAccountGateway } from "../src/infrastructure/mock-investment-account-gateway.js";
import { buildServer } from "../src/server/app.js";
import { composeInvestmentAccountRuntime } from "../src/server/investment-account-composition.js";
import { SaxoInvestmentAccountGateway } from "../src/saxo/saxo-investment-account-gateway.js";

const simConfiguration = {
  provider: "saxo-sim" as const,
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  redirectUri: "http://127.0.0.1:3000/auth/saxo/callback",
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("investment account runtime composition", () => {
  it("uses the mock gateway without credentials or OAuth routes in mock mode", async () => {
    const runtime = composeInvestmentAccountRuntime({ provider: "mock" });
    const app = buildServer(runtime);

    try {
      expect(runtime.investmentAccountGateway).toBeInstanceOf(MockInvestmentAccountGateway);
      expect(runtime.saxoOAuth).toBeUndefined();
      expect(runtime.getInvestmentConnectionStatus()).toEqual({
        source: "mock",
        status: "connected",
      });

      const accountsResponse = await app.inject({
        method: "GET",
        url: "/api/investment-accounts",
      });
      const oauthResponse = await app.inject({ method: "GET", url: "/auth/saxo/start" });

      expect(accountsResponse.statusCode).toBe(200);
      expect(accountsResponse.json()).toEqual([
        { id: "mock-account-1", name: "Investment account", currency: "DKK" },
      ]);
      expect(oauthResponse.statusCode).toBe(404);
      const balanceResponse = await app.inject({ method: "GET", url: "/api/investment-balance" });
      expect(balanceResponse.statusCode).toBe(200);
      expect(balanceResponse.json()).toEqual({
        currency: "DKK",
        cashBalance: 50_000,
        totalValue: 100_000,
      });
      const positionsResponse = await app.inject({
        method: "GET",
        url: "/api/investment-positions",
      });
      expect(positionsResponse.statusCode).toBe(200);
      expect(positionsResponse.json()).toEqual([
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

  it("uses the Saxo gateway and fails safely before authentication", async () => {
    const tokenFetch = vi.fn(async () => jsonResponse({}));
    const accountFetch = vi.fn(async () => jsonResponse({ Data: [] }));
    const runtime = composeInvestmentAccountRuntime(simConfiguration, {
      tokenFetch,
      accountFetch,
    });
    const app = buildServer(runtime);

    try {
      expect(runtime.investmentAccountGateway).toBeInstanceOf(SaxoInvestmentAccountGateway);
      expect(runtime.saxoOAuth).toBeDefined();
      expect(runtime.getInvestmentConnectionStatus()).toEqual({
        source: "saxo-sim",
        status: "not-connected",
      });

      const response = await app.inject({ method: "GET", url: "/api/investment-accounts" });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ error: "Investment accounts are not available" });
      expect(response.body).not.toMatch(/test-client-secret|access token is unavailable/);
      expect(tokenFetch).not.toHaveBeenCalled();
      expect(accountFetch).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("uses the developer token for accounts without registering OAuth routes", async () => {
    const accountFetch = vi.fn<
      (input: string | URL, init?: RequestInit) => Promise<Response>
    >(async () =>
      jsonResponse({
        Data: [
          {
            AccountKey: "developer-account-key",
            AccountId: "developer-account-id",
            DisplayName: "Developer SIM account",
            Currency: "EUR",
          },
        ],
      }),
    );
    const runtime = composeInvestmentAccountRuntime(
      { provider: "saxo-sim", developerAccessToken: "test-developer-token" },
      {
        accountFetch,
        balanceFetch: async (_input, init) => {
          expect(new Headers(init?.headers).get("Authorization")).toBe(
            "Bearer test-developer-token",
          );
          return jsonResponse({ Currency: "EUR", CashBalance: 500, TotalValue: 1_000 });
        },
        positionFetch: async (input, init) => {
          expect(new Headers(init?.headers).get("Authorization")).toBe(
            "Bearer test-developer-token",
          );
          if (input.toString().includes("/ref/v1/instruments/details/")) {
            return jsonResponse({
              Uic: 12345,
              AssetType: "Stock",
              Description: "Developer Example Company",
              Symbol: "DEVEX",
            });
          }
          return jsonResponse({
            Data: [
              {
                PositionId: "developer-position-id",
                PositionBase: { Amount: 2, AssetType: "Stock", Uic: 12345 },
                PositionView: { CurrentPrice: 50, Exposure: 100, ExposureCurrency: "EUR" },
              },
            ],
          });
        },
      },
    );
    const app = buildServer(runtime);

    try {
      expect(runtime.investmentAccountGateway).toBeInstanceOf(SaxoInvestmentAccountGateway);
      expect(runtime.saxoOAuth).toBeUndefined();
      expect(runtime.getInvestmentConnectionStatus()).toEqual({
        source: "saxo-sim",
        status: "connected",
      });

      const accountsResponse = await app.inject({
        method: "GET",
        url: "/api/investment-accounts",
      });
      const startResponse = await app.inject({ method: "GET", url: "/auth/saxo/start" });
      const callbackResponse = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=test-code&state=test-state",
      });

      expect(accountsResponse.statusCode).toBe(200);
      expect(accountsResponse.json()).toEqual([
        {
          id: expect.stringMatching(/^saxo-[a-f0-9]{64}$/),
          name: "Developer SIM account",
          currency: "EUR",
        },
      ]);
      expect(accountsResponse.body).not.toMatch(
        /test-developer-token|developer-account-key|developer-account-id/,
      );
      expect(startResponse.statusCode).toBe(404);
      expect(callbackResponse.statusCode).toBe(404);
      const balanceResponse = await app.inject({ method: "GET", url: "/api/investment-balance" });
      expect(balanceResponse.json()).toEqual({
        currency: "EUR",
        cashBalance: 500,
        totalValue: 1_000,
      });
      const positionsResponse = await app.inject({
        method: "GET",
        url: "/api/investment-positions",
      });
      expect(positionsResponse.statusCode).toBe(200);
      expect(positionsResponse.json()).toMatchObject([
        {
          instrumentName: "Developer Example Company",
          symbol: "DEVEX",
          assetType: "Stock",
          amount: 2,
          exposureCurrency: "EUR",
        },
      ]);
      expect(positionsResponse.body).not.toMatch(
        /test-developer-token|developer-position-id|Uic/,
      );
      expect(accountFetch).toHaveBeenCalledOnce();
      expect(new Headers(accountFetch.mock.calls[0]![1]?.headers).get("Authorization")).toBe(
        "Bearer test-developer-token",
      );
    } finally {
      await app.close();
    }
  });

  it("returns a generic failure for an invalid developer token", async () => {
    const accountFetch = vi.fn(async () =>
      jsonResponse({ error: "raw-saxo-error", access_token: "response-token" }, 401),
    );
    const runtime = composeInvestmentAccountRuntime(
      { provider: "saxo-sim", developerAccessToken: "test-developer-token" },
      { accountFetch },
    );
    const app = buildServer(runtime);

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-accounts" });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ error: "Investment accounts are not available" });
      expect(response.body).not.toMatch(
        /test-developer-token|raw-saxo-error|response-token/,
      );
    } finally {
      await app.close();
    }
  });

  it("keeps positions available when developer-token enrichment returns 404", async () => {
    const runtime = composeInvestmentAccountRuntime(
      { provider: "saxo-sim", developerAccessToken: "test-developer-token" },
      {
        accountFetch: async () => jsonResponse({ Data: [] }),
        balanceFetch: async () =>
          jsonResponse({ Currency: "DKK", CashBalance: 0, TotalValue: 0 }),
        positionFetch: async (input) =>
          input.toString().includes("/ref/v1/instruments/details/")
            ? jsonResponse({ error: "not-found" }, 404)
            : jsonResponse({
                Data: [
                  {
                    PositionId: "private-position-id",
                    PositionBase: { Amount: 1, AssetType: "Stock", Uic: 12345 },
                    PositionView: {
                      CurrentPrice: 10,
                      Exposure: 10,
                      ExposureCurrency: "DKK",
                    },
                  },
                ],
              }),
      },
    );
    const app = buildServer(runtime);

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-positions" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject([
        { instrumentName: null, symbol: null, assetType: "Stock" },
      ]);
      expect(response.body).not.toMatch(/private-position-id|12345|not-found/);
    } finally {
      await app.close();
    }
  });

  it("shares callback-acquired tokens with the Saxo account gateway", async () => {
    const tokenFetch = vi.fn(async () =>
      jsonResponse({
        access_token: "test-access-token",
        token_type: "Bearer",
        expires_in: 900,
        refresh_token: "test-refresh-token",
        refresh_token_expires_in: 3600,
      }),
    );
    const accountFetch = vi.fn<
      (input: string | URL, init?: RequestInit) => Promise<Response>
    >(async () =>
      jsonResponse({
        Data: [
          {
            AccountKey: "test-account-key",
            AccountId: "test-account-id",
            DisplayName: "SIM investment account",
            Currency: "DKK",
          },
        ],
      }),
    );
    const runtime = composeInvestmentAccountRuntime(simConfiguration, {
      tokenFetch,
      accountFetch,
      balanceFetch: async (_input, init) => {
        expect(new Headers(init?.headers).get("Authorization")).toBe(
          "Bearer test-access-token",
        );
        return jsonResponse({ Currency: "DKK", CashBalance: 750, TotalValue: 1_500 });
      },
      positionFetch: async (input, init) => {
        expect(new Headers(init?.headers).get("Authorization")).toBe(
          "Bearer test-access-token",
        );
        if (input.toString().includes("/ref/v1/instruments/details/")) {
          return jsonResponse({
            Uic: 67890,
            AssetType: "Bond",
            Description: "OAuth Example Bond",
            Symbol: "OAUTHX",
          });
        }
        return jsonResponse({
          Data: [
            {
              PositionId: "oauth-position-id",
              PositionBase: { Amount: 3, AssetType: "Bond", Uic: 67890 },
              PositionView: { CurrentPrice: 75, Exposure: 225, ExposureCurrency: "DKK" },
            },
          ],
        });
      },
      generateState: () => "shared-state",
    });
    const app = buildServer(runtime);

    try {
      const startResponse = await app.inject({ method: "GET", url: "/auth/saxo/start" });
      const callbackResponse = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=test-code&state=shared-state",
      });
      const accountsResponse = await app.inject({
        method: "GET",
        url: "/api/investment-accounts",
      });

      expect(startResponse.statusCode).toBe(302);
      expect(callbackResponse.statusCode).toBe(200);
      expect(runtime.getInvestmentConnectionStatus()).toEqual({
        source: "saxo-sim",
        status: "connected",
      });
      expect(callbackResponse.body).not.toMatch(
        /test-code|shared-state|test-access-token|test-refresh-token|test-client-secret/,
      );
      expect(accountsResponse.statusCode).toBe(200);
      expect(accountsResponse.json()).toEqual([
        {
          id: expect.stringMatching(/^saxo-[a-f0-9]{64}$/),
          name: "SIM investment account",
          currency: "DKK",
        },
      ]);
      expect(accountsResponse.body).not.toMatch(
        /test-account-key|test-account-id|test-access-token|test-refresh-token|test-client-secret/,
      );
      expect(tokenFetch).toHaveBeenCalledOnce();
      expect(accountFetch).toHaveBeenCalledOnce();
      expect(new Headers(accountFetch.mock.calls[0]![1]?.headers).get("Authorization")).toBe(
        "Bearer test-access-token",
      );
      const balanceResponse = await app.inject({ method: "GET", url: "/api/investment-balance" });
      expect(balanceResponse.json()).toEqual({
        currency: "DKK",
        cashBalance: 750,
        totalValue: 1_500,
      });
      const positionsResponse = await app.inject({
        method: "GET",
        url: "/api/investment-positions",
      });
      expect(positionsResponse.statusCode).toBe(200);
      expect(positionsResponse.json()).toMatchObject([
        {
          instrumentName: "OAuth Example Bond",
          symbol: "OAUTHX",
          assetType: "Bond",
          amount: 3,
          exposureCurrency: "DKK",
        },
      ]);
      expect(positionsResponse.body).not.toMatch(
        /test-access-token|test-refresh-token|oauth-position-id|Uic/,
      );
    } finally {
      await app.close();
    }
  });

  it("returns a safe balance failure before OAuth authentication", async () => {
    const runtime = composeInvestmentAccountRuntime(simConfiguration, {
      tokenFetch: async () => jsonResponse({}),
      accountFetch: async () => jsonResponse({ Data: [] }),
      balanceFetch: async () => jsonResponse({ Currency: "DKK", CashBalance: 0, TotalValue: 0 }),
    });
    const app = buildServer(runtime);

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-balance" });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ error: "Investment balance is not available" });
      expect(response.body).not.toMatch(/token|secret|authentication/i);
    } finally {
      await app.close();
    }
  });

  it("returns a safe positions failure before OAuth authentication", async () => {
    const runtime = composeInvestmentAccountRuntime(simConfiguration, {
      tokenFetch: async () => jsonResponse({}),
      accountFetch: async () => jsonResponse({ Data: [] }),
      balanceFetch: async () => jsonResponse({ Currency: "DKK", CashBalance: 0, TotalValue: 0 }),
      positionFetch: async () => jsonResponse({ Data: [] }),
    });
    const app = buildServer(runtime);

    try {
      const response = await app.inject({ method: "GET", url: "/api/investment-positions" });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toEqual({ error: "Investment positions are not available" });
      expect(response.body).not.toMatch(/token|secret|authentication/i);
    } finally {
      await app.close();
    }
  });
});