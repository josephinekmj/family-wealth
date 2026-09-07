import { describe, expect, it, vi } from "vitest";
import type { SaxoAccessTokenProvider } from "../src/saxo/index.js";
import { SaxoInvestmentBalanceGateway } from "../src/saxo/saxo-investment-balance-gateway.js";

const accessTokenProvider = (value = "test-access-token") => {
  const getAccessToken = vi.fn(async () => ({ value, expiresAt: null }));
  return {
    provider: { getAccessToken } satisfies SaxoAccessTokenProvider,
    getAccessToken,
  };
};

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("SaxoInvestmentBalanceGateway", () => {
  it("requests only the SIM portfolio balance endpoint with Bearer authentication", async () => {
    const { provider, getAccessToken } = accessTokenProvider();
    const fetchRequest = vi.fn<
      (input: string | URL, init?: RequestInit) => Promise<Response>
    >(async () => jsonResponse({ Currency: "DKK", CashBalance: 0, TotalValue: 0 }));
    const gateway = new SaxoInvestmentBalanceGateway(provider, fetchRequest);

    await gateway.getBalance();

    expect(getAccessToken).toHaveBeenCalledOnce();
    expect(fetchRequest).toHaveBeenCalledOnce();
    const [url, init] = fetchRequest.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe("https://gateway.saxobank.com/sim/openapi/port/v1/balances/me");
    expect(new URL(url).search).toBe("");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(headers.get("Authorization")).toBe("Bearer test-access-token");
    expect(headers.get("Authorization")).not.toContain("Basic");
  });

  it.each([
    { Currency: "DKK", CashBalance: 12_345.67, TotalValue: 23_456.78 },
    { Currency: "EUR", CashBalance: 0, TotalValue: 0 },
    { Currency: "USD", CashBalance: -10, TotalValue: -5 },
  ])("maps finite balance values %#", async (response) => {
    const { provider } = accessTokenProvider();
    const gateway = new SaxoInvestmentBalanceGateway(provider, async () =>
      jsonResponse({ ...response, AccountKey: "must-not-leak", MarginAvailable: 999 }),
    );

    const balance = await gateway.getBalance();

    expect(balance).toEqual({
      currency: response.Currency,
      cashBalance: response.CashBalance,
      totalValue: response.TotalValue,
    });
    expect(Object.keys(balance).sort()).toEqual(["cashBalance", "currency", "totalValue"]);
    expect(JSON.stringify(balance)).not.toMatch(/AccountKey|MarginAvailable|must-not-leak/);
  });

  it("fails generically when the token provider fails", async () => {
    const provider: SaxoAccessTokenProvider = {
      getAccessToken: async () => {
        throw new Error("sensitive-token-detail");
      },
    };
    const fetchRequest = vi.fn(async () => jsonResponse({}));
    const gateway = new SaxoInvestmentBalanceGateway(provider, fetchRequest);

    await expect(gateway.getBalance()).rejects.toThrow("Could not load Saxo investment balance");
    await expect(gateway.getBalance()).rejects.not.toThrow("sensitive-token-detail");
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it("fails generically for non-success and invalid JSON responses", async () => {
    const { provider } = accessTokenProvider("sensitive-access-token");
    const nonSuccessGateway = new SaxoInvestmentBalanceGateway(provider, async () =>
      jsonResponse({ error: "raw-saxo-error", AccountKey: "private-key" }, 403),
    );
    const invalidJsonGateway = new SaxoInvestmentBalanceGateway(
      provider,
      async () => new Response("raw-invalid-json", { status: 200 }),
    );

    await expect(nonSuccessGateway.getBalance()).rejects.toThrow(
      "Could not load Saxo investment balance",
    );
    await expect(nonSuccessGateway.getBalance()).rejects.not.toThrow(
      /raw-saxo-error|private-key|sensitive-access-token/,
    );
    await expect(invalidJsonGateway.getBalance()).rejects.toThrow(
      "Could not load Saxo investment balance",
    );
    await expect(invalidJsonGateway.getBalance()).rejects.not.toThrow("raw-invalid-json");
  });

  it.each([
    null,
    {},
    { Currency: "", CashBalance: 0, TotalValue: 0 },
    { Currency: "DKK", TotalValue: 0 },
    { Currency: "DKK", CashBalance: Number.NaN, TotalValue: 0 },
    { Currency: "DKK", CashBalance: Number.POSITIVE_INFINITY, TotalValue: 0 },
    { Currency: "DKK", CashBalance: 0 },
    { Currency: "DKK", CashBalance: 0, TotalValue: Number.NEGATIVE_INFINITY },
  ])("fails closed for malformed response %#", async (body) => {
    const { provider } = accessTokenProvider("sensitive-access-token");
    const gateway = new SaxoInvestmentBalanceGateway(provider, async () => jsonResponse(body));

    await expect(gateway.getBalance()).rejects.toThrow("Could not load Saxo investment balance");
    await expect(gateway.getBalance()).rejects.not.toThrow(/sensitive-access-token|AccountKey/);
  });
});