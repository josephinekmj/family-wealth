import { afterEach, describe, expect, it, vi } from "vitest";
import type { InvestmentPositionSummary } from "../src/application/index.js";
import { fetchInvestmentPositions } from "../src/web/client/investment-positions.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("fetchInvestmentPositions", () => {
  it("uses GET /api/investment-positions and returns positions", async () => {
    const positions: InvestmentPositionSummary[] = [
      {
        id: "opaque-position",
        assetType: "Stock",
        amount: 10,
        currentPrice: 100,
        exposure: 1_000,
        exposureCurrency: "DKK",
      },
    ];
    const fetchMock = vi.fn(async () => Response.json(positions));
    globalThis.fetch = fetchMock as typeof fetch;

    expect(await fetchInvestmentPositions()).toEqual(positions);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/investment-positions");
  });

  it("accepts an empty array", async () => {
    globalThis.fetch = vi.fn(async () => Response.json([])) as typeof fetch;
    await expect(fetchInvestmentPositions()).resolves.toEqual([]);
  });

  it("rejects non-success and malformed responses", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 503 })) as typeof fetch;
    await expect(fetchInvestmentPositions()).rejects.toThrow("Could not load investment positions");

    globalThis.fetch = vi.fn(async () => Response.json({ Data: [] })) as typeof fetch;
    await expect(fetchInvestmentPositions()).rejects.toThrow("Could not load investment positions");
  });
});