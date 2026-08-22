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

describe("PUT /api/goals/:id", () => {
  const validBody = {
    name: "Confirmation",
    targetAmount: 40000,
    currentAmount: 5000,
    targetDate: "2033-05-01T00:00:00.000Z",
    expectedAnnualReturn: 0.04,
  };

  async function createApp() {
    const app = buildServer();
    await app.ready();
    return app;
  }

  it("saves a new goal that is visible through GET", async () => {
    const app = await createApp();

    try {
      const putResponse = await app.inject({
        method: "PUT",
        url: "/api/goals/new-goal",
        payload: validBody,
      });
      const getResponse = await app.inject({ method: "GET", url: "/api/goals" });

      expect(putResponse.statusCode).toBe(204);
      expect(putResponse.body).toBe("");
      expect(getResponse.json()).toContainEqual({ id: "new-goal", ...validBody });
    } finally {
      await app.close();
    }
  });

  it("updates an existing goal by URL id", async () => {
    const app = await createApp();
    const updatedBody = { ...validBody, name: "Updated confirmation", currentAmount: 9000 };

    try {
      const putResponse = await app.inject({
        method: "PUT",
        url: "/api/goals/confirmation-2019",
        payload: updatedBody,
      });
      const getResponse = await app.inject({ method: "GET", url: "/api/goals" });
      const goals = getResponse.json<Array<{ id: string; name: string; currentAmount: number }>>();

      expect(putResponse.statusCode).toBe(204);
      expect(goals).toHaveLength(2);
      expect(goals.find((goal) => goal.id === "confirmation-2019")).toMatchObject({
        name: "Updated confirmation",
        currentAmount: 9000,
      });
    } finally {
      await app.close();
    }
  });

  it.each([
    ["missing required field", { ...validBody, name: undefined }],
    ["wrong field type", { ...validBody, targetAmount: "40000" }],
    ["extra unknown field", { ...validBody, id: "body-id" }],
    ["blank name", { ...validBody, name: "   " }],
    ["non-positive target amount", { ...validBody, targetAmount: 0 }],
    ["negative current amount", { ...validBody, currentAmount: -1 }],
    ["invalid target date", { ...validBody, targetDate: "not-a-date" }],
    ["return at or below minus one", { ...validBody, expectedAnnualReturn: -1 }],
  ])("rejects %s without mutating goals", async (_case, payload) => {
    const app = await createApp();

    try {
      const before = await app.inject({ method: "GET", url: "/api/goals" });
      const putResponse = await app.inject({
        method: "PUT",
        url: "/api/goals/invalid-goal",
        payload,
      });
      const after = await app.inject({ method: "GET", url: "/api/goals" });

      expect(putResponse.statusCode).toBe(400);
      expect(putResponse.json()).toEqual({ error: "Invalid savings goal" });
      expect(after.json()).toEqual(before.json());
    } finally {
      await app.close();
    }
  });
});
