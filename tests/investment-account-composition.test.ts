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
      { accountFetch },
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
    } finally {
      await app.close();
    }
  });
});