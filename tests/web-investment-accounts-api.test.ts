import { afterEach, describe, expect, it, vi } from "vitest";
import type { InvestmentAccountSummary } from "../src/application/investment-account-contracts.js";
import { fetchInvestmentAccounts } from "../src/web/client/investment-accounts.js";

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
