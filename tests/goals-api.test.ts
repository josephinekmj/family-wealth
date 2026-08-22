import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildServer } from "../src/server/app.js";

describe("GET /api/goals", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns HTTP 200", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/goals",
    });

    expect(response.statusCode).toBe(200);
  });

  it("returns JSON array with seeded goals", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/goals",
    });

    const payload = response.json();

    expect(Array.isArray(payload)).toBe(true);
    expect(payload).toHaveLength(2);
    expect(payload).toEqual([
      {
        id: "confirmation-2019",
        name: "Confirmation 2019",
        targetAmount: 40000,
        currentAmount: 0,
        targetDate: "2033-05-01T00:00:00.000Z",
        expectedAnnualReturn: 0.04,
      },
      {
        id: "confirmation-2021",
        name: "Confirmation 2021",
        targetAmount: 40000,
        currentAmount: 1000,
        targetDate: "2035-05-01T00:00:00.000Z",
        expectedAnnualReturn: 0.05,
      },
    ]);
  });

  it("serializes targetDate as string and exposes public fields only", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/goals",
    });

    const payload = response.json() as Array<Record<string, unknown>>;
    const firstGoal = payload[0]!;

    expect(typeof firstGoal.targetDate).toBe("string");
    expect(Object.keys(firstGoal).sort()).toEqual([
      "currentAmount",
      "expectedAnnualReturn",
      "id",
      "name",
      "targetAmount",
      "targetDate",
    ]);
  });
});