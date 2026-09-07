import { describe, expect, it, vi } from "vitest";
import type { SaxoAccessTokenProvider } from "../src/saxo/index.js";
import { SaxoInvestmentAccountGateway } from "../src/saxo/saxo-investment-account-gateway.js";

const accessTokenProvider = (value = "test-access-token") => {
  const getAccessToken = vi.fn(async () => ({
    value,
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
  }));
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

describe("SaxoInvestmentAccountGateway", () => {
  it("requests only the SIM current-user accounts endpoint with Bearer authentication", async () => {
    const { provider, getAccessToken } = accessTokenProvider();
    const fetchRequest = vi.fn<
      (input: string | URL, init?: RequestInit) => Promise<Response>
    >(async () => jsonResponse({ Data: [] }));
    const gateway = new SaxoInvestmentAccountGateway(provider, fetchRequest);

    await gateway.listAccounts();

    expect(getAccessToken).toHaveBeenCalledOnce();
    expect(fetchRequest).toHaveBeenCalledOnce();
    const [url, init] = fetchRequest.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(url).toBe("https://gateway.saxobank.com/sim/openapi/port/v1/accounts/me");
    expect(new URL(url).search).toBe("");
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(headers.get("Authorization")).toBe("Bearer test-access-token");
    expect(headers.get("Authorization")).not.toContain("Basic");
  });

  it("maps multiple accounts to provider-neutral summaries only", async () => {
    const { provider } = accessTokenProvider();
    const gateway = new SaxoInvestmentAccountGateway(provider, async () =>
      jsonResponse({
        Data: [
          {
            AccountKey: "account-key-one",
            AccountId: "account-id-one",
            DisplayName: "Long-term investments",
            Currency: "DKK",
            ClientKey: "must-not-leak",
            AccountType: "Normal",
            Balance: 123456,
          },
          {
            AccountKey: "account-key-two",
            AccountId: "account-id-two",
            Currency: "EUR",
            IsTrialAccount: true,
          },
        ],
        __next: "ignored",
      }),
    );

    const accounts = await gateway.listAccounts();

    expect(accounts).toHaveLength(2);
    expect(accounts[0]).toEqual({
      id: expect.stringMatching(/^saxo-[a-f0-9]{64}$/),
      name: "Long-term investments",
      currency: "DKK",
    });
    expect(accounts[1]).toEqual({
      id: expect.stringMatching(/^saxo-[a-f0-9]{64}$/),
      name: "account-id-two",
      currency: "EUR",
    });
    expect(accounts[0]!.id).not.toBe(accounts[1]!.id);
    expect(JSON.stringify(accounts)).not.toMatch(
      /account-key|ClientKey|AccountType|Balance|IsTrialAccount|must-not-leak/,
    );
    expect(Object.keys(accounts[0]!).sort()).toEqual(["currency", "id", "name"]);
  });

  it("returns an empty array for empty Data", async () => {
    const { provider } = accessTokenProvider();
    const gateway = new SaxoInvestmentAccountGateway(provider, async () =>
      jsonResponse({ Data: [] }),
    );

    await expect(gateway.listAccounts()).resolves.toEqual([]);
  });

  it("derives the same opaque id from the same AccountKey", async () => {
    const { provider } = accessTokenProvider();
    const gateway = new SaxoInvestmentAccountGateway(provider, async () =>
      jsonResponse({
        Data: [
          {
            AccountKey: "stable-account-key",
            AccountId: "account-id",
            Currency: "DKK",
          },
        ],
      }),
    );

    const first = await gateway.listAccounts();
    const second = await gateway.listAccounts();

    expect(first[0]!.id).toBe(second[0]!.id);
    expect(first[0]!.id).not.toContain("stable-account-key");
  });

  it("maps a blank DisplayName to AccountId", async () => {
    const { provider } = accessTokenProvider();
    const gateway = new SaxoInvestmentAccountGateway(provider, async () =>
      jsonResponse({
        Data: [
          {
            AccountKey: "account-key",
            AccountId: "fallback-account-id",
            DisplayName: "  ",
            Currency: "USD",
          },
        ],
      }),
    );

    await expect(gateway.listAccounts()).resolves.toMatchObject([
      { name: "fallback-account-id", currency: "USD" },
    ]);
  });

  it("returns a generic failure when the token provider fails", async () => {
    const provider: SaxoAccessTokenProvider = {
      getAccessToken: vi.fn(async () => {
        throw new Error("sensitive-token-provider-detail");
      }),
    };
    const fetchRequest = vi.fn(async () => jsonResponse({ Data: [] }));
    const gateway = new SaxoInvestmentAccountGateway(provider, fetchRequest);

    await expect(gateway.listAccounts()).rejects.toThrow(
      "Could not load Saxo investment accounts",
    );
    await expect(gateway.listAccounts()).rejects.not.toThrow("sensitive-token-provider-detail");
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it("returns a generic failure for non-success responses", async () => {
    const { provider } = accessTokenProvider("sensitive-access-token");
    const gateway = new SaxoInvestmentAccountGateway(provider, async () =>
      jsonResponse(
        {
          error: "raw-saxo-error",
          AccountKey: "private-account-key",
          access_token: "response-token",
        },
        403,
      ),
    );

    await expect(gateway.listAccounts()).rejects.toThrow(
      "Could not load Saxo investment accounts",
    );
    await expect(gateway.listAccounts()).rejects.not.toThrow(
      /raw-saxo-error|private-account-key|sensitive-access-token|response-token/,
    );
  });

  it("returns a generic failure for invalid JSON", async () => {
    const { provider } = accessTokenProvider();
    const gateway = new SaxoInvestmentAccountGateway(
      provider,
      async () => new Response("raw-invalid-json", { status: 200 }),
    );

    await expect(gateway.listAccounts()).rejects.toThrow(
      "Could not load Saxo investment accounts",
    );
    await expect(gateway.listAccounts()).rejects.not.toThrow("raw-invalid-json");
  });

  it.each([
    null,
    {},
    { Data: "not-an-array" },
    { Data: [null] },
    { Data: [{ AccountId: "account-id", Currency: "DKK" }] },
    { Data: [{ AccountKey: "private-account-key", Currency: "DKK" }] },
    { Data: [{ AccountKey: "private-account-key", AccountId: "account-id" }] },
    {
      Data: [
        {
          AccountKey: "private-account-key",
          AccountId: "account-id",
          Currency: " ",
        },
      ],
    },
  ])("fails closed for malformed response %#", async (body) => {
    const { provider } = accessTokenProvider("sensitive-access-token");
    const gateway = new SaxoInvestmentAccountGateway(provider, async () => jsonResponse(body));

    await expect(gateway.listAccounts()).rejects.toThrow(
      "Could not load Saxo investment accounts",
    );
    await expect(gateway.listAccounts()).rejects.not.toThrow(
      /private-account-key|sensitive-access-token|account-id/,
    );
  });
});