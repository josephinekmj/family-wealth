import { describe, expect, it } from "vitest";
import { createSavingsGoalQueries } from "../src/application/savings-goal-queries.js";
import { InMemorySavingsGoalRepository } from "../src/application/in-memory-savings-goal-repository.js";

describe("savings goal queries integration", () => {
  it("application can list goals through repository interface", async () => {
    const repository = new InMemorySavingsGoalRepository([
      {
        goal: {
          id: "goal-1",
          name: "Confirmation 2019",
          targetAmount: 40000,
          currentAmount: 3000,
          targetDate: new Date("2029-05-01T00:00:00.000Z"),
        },
        expectedAnnualReturn: 0.05,
      },
      {
        goal: {
          id: "goal-2",
          name: "Confirmation 2021",
          targetAmount: 40000,
          currentAmount: 1000,
          targetDate: new Date("2031-05-01T00:00:00.000Z"),
        },
        expectedAnnualReturn: 0.04,
      },
    ]);
    const queries = createSavingsGoalQueries(repository);

    const goals = await queries.listSavingsGoals();

    expect(goals).toHaveLength(2);
    expect(goals.map((item) => item.goal.name)).toEqual([
      "Confirmation 2019",
      "Confirmation 2021",
    ]);
  });

  it("application handles empty repository", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const queries = createSavingsGoalQueries(repository);

    const goals = await queries.listSavingsGoals();

    expect(goals).toEqual([]);
  });
});