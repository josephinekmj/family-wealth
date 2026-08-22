import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSavingsGoals, updateSavingsGoal } from "../src/web/client/savings-goals.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
});

describe("fetchSavingsGoals", () => {
  it("uses GET /api/goals", async () => {
    const fetchMock = vi.fn(
      async () =>
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
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as typeof fetch;

    const result = await fetchSavingsGoals();

    expect(result).toEqual(payload);
  });

  it("throws Error for non-2xx responses", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("Not Found", {
          status: 404,
        }),
    ) as typeof fetch;

    await expect(fetchSavingsGoals()).rejects.toThrow(/Could not load savings goals/);
  });
});

describe("updateSavingsGoal", () => {
  const update = {
    name: "Updated goal",
    targetAmount: 50000,
    currentAmount: 6000,
    targetDate: "2034-06-01T00:00:00.000Z",
    expectedAnnualReturn: 0.04,
  };

  it("sends the update body with PUT to the encoded goal URL", async () => {
    let requestInit: RequestInit | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      requestInit = init;
      return new Response(null, { status: 204 });
    });
    globalThis.fetch = fetchMock as typeof fetch;

    await updateSavingsGoal("goal/with spaces", update);

    expect(fetchMock).toHaveBeenCalledWith("/api/goals/goal%2Fwith%20spaces", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    const requestBody = JSON.parse(requestInit!.body as string) as Record<string, unknown>;
    expect(requestBody).toEqual(update);
    expect(requestBody).not.toHaveProperty("id");
  });

  it("resolves for HTTP 204", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 204 })) as typeof fetch;

    await expect(updateSavingsGoal("goal-1", update)).resolves.toBeUndefined();
  });

  it("throws Error for non-2xx responses", async () => {
    globalThis.fetch = vi.fn(async () => new Response(null, { status: 400 })) as typeof fetch;

    await expect(updateSavingsGoal("goal-1", update)).rejects.toThrow(
      /Could not save savings goal/,
    );
  });
});
