import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSavingsGoals } from "../src/web/client/savings-goals.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("fetchSavingsGoals", () => {
  it("uses GET /api/goals", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await fetchSavingsGoals();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("/api/goals");
  });

  it("returns parsed JSON for successful responses", async () => {
    const payload = [
      {
        id: "confirmation-2019",
        name: "Confirmation 2019",
        targetAmount: 40000,
        currentAmount: 0,
        targetDate: "2033-05-01T00:00:00.000Z",
        expectedAnnualReturn: 0.04,
      },
    ];
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as typeof fetch;

    const result = await fetchSavingsGoals();

    expect(result).toEqual(payload);
  });

  it("throws Error for non-2xx responses", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("Not Found", {
        status: 404,
      }),
    ) as typeof fetch;

    await expect(fetchSavingsGoals()).rejects.toThrow(/Could not load savings goals/);
  });
});