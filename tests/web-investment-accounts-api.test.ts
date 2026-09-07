import { afterEach, describe, expect, it, vi } from "vitest";
import type { InvestmentAccountSummary } from "../src/application/investment-account-contracts.js";
import {
  fetchInvestmentAccounts,
  fetchInvestmentBalance,
  fetchInvestmentConnectionStatus,
} from "../src/web/client/investment-accounts.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("fetchInvestmentAccounts", () => {
  it("uses GET /api/investment-accounts", async () => {
    const fetchMock = vi.fn(async () => Response.json([]));
    globalThis.fetch = fetchMock as typeof fetch;

    await fetchInvestmentAccounts();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/investment-accounts");
  });

  it("returns the successful account array", async () => {
    const accounts: InvestmentAccountSummary[] = [
      { id: "mock-account-1", name: "Investment account", currency: "DKK" },
    ];
    globalThis.fetch = vi.fn(async () => Response.json(accounts)) as typeof fetch;

    expect(await fetchInvestmentAccounts()).toEqual(accounts);
  });

  it("accepts an empty array", async () => {
    globalThis.fetch = vi.fn(async () => Response.json([])) as typeof fetch;

    expect(await fetchInvestmentAccounts()).toEqual([]);
  });

  it("throws Error for non-2xx responses", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 500 })) as typeof fetch;

    await expect(fetchInvestmentAccounts()).rejects.toThrow(/Could not load investment accounts/);
  });
});

describe("fetchInvestmentConnectionStatus", () => {
  it("uses GET /api/investment-accounts/status", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ source: "mock", status: "connected" }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await fetchInvestmentConnectionStatus();

    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/investment-accounts/status");
  });

  it.each([
    { source: "mock", status: "connected" },
    { source: "saxo-sim", status: "connected" },
    { source: "saxo-sim", status: "not-connected" },
  ] as const)("returns valid status %#", async (status) => {
    globalThis.fetch = vi.fn(async () => Response.json(status)) as typeof fetch;

    expect(await fetchInvestmentConnectionStatus()).toEqual(status);
  });

  it("rejects non-success responses", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;

    await expect(fetchInvestmentConnectionStatus()).rejects.toThrow(
      /Could not load investment connection status/,
    );
  });

  it.each([
    null,
    {},
    { source: "saxo-live", status: "connected" },
    { source: "saxo-sim", status: "authenticated" },
  ])("rejects malformed status %#", async (status) => {
    globalThis.fetch = vi.fn(async () => Response.json(status)) as typeof fetch;

    await expect(fetchInvestmentConnectionStatus()).rejects.toThrow(
      "Could not load investment connection status",
    );
  });
});

describe("fetchInvestmentBalance", () => {
  it("uses GET /api/investment-balance and returns its three fields", async () => {
    const balance = { currency: "DKK", cashBalance: 50_000, totalValue: 100_000 };
    const fetchMock = vi.fn(async () => Response.json(balance));
    globalThis.fetch = fetchMock as typeof fetch;

    expect(await fetchInvestmentBalance()).toEqual(balance);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/investment-balance");
  });

  it("rejects non-success and malformed responses", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;
    await expect(fetchInvestmentBalance()).rejects.toThrow("Could not load investment balance");

    globalThis.fetch = vi.fn(async () =>
      Response.json({ currency: "DKK", cashBalance: "50000", totalValue: 100_000 }),
    ) as typeof fetch;
    await expect(fetchInvestmentBalance()).rejects.toThrow("Could not load investment balance");
  });
});
