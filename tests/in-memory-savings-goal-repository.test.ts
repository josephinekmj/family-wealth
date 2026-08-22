import { describe, expect, it } from "vitest";
import { InMemorySavingsGoalRepository } from "../src/application/in-memory-savings-goal-repository.js";
import type { SavingsGoalProfile } from "../src/application/savings-goal-contracts.js";

function createGoalProfile(
  id: string,
  name: string,
  currentAmount: number,
  targetAmount: number,
  targetDate: string,
  expectedAnnualReturn: number,
): SavingsGoalProfile {
  return {
    goal: {
      id,
      name,
      currentAmount,
      targetAmount,
      targetDate: new Date(targetDate),
    },
    expectedAnnualReturn,
  };
}

describe("InMemorySavingsGoalRepository", () => {
  it("starts empty when no seed data is provided", async () => {
    const repository = new InMemorySavingsGoalRepository();

    const goals = await repository.findAll();

    expect(goals).toEqual([]);
  });

  it("returns seeded goals", async () => {
    const seed = [
      createGoalProfile("goal-1", "Confirmation 2019", 3000, 40000, "2029-05-01T00:00:00.000Z", 0.05),
      createGoalProfile("goal-2", "Confirmation 2021", 1000, 40000, "2031-05-01T00:00:00.000Z", 0.04),
    ];
    const repository = new InMemorySavingsGoalRepository(seed);

    const goals = await repository.findAll();

    expect(goals).toHaveLength(2);
    expect(goals.map((item) => item.goal.id)).toEqual(["goal-1", "goal-2"]);
  });

  it("findById returns existing goal", async () => {
    const repository = new InMemorySavingsGoalRepository([
      createGoalProfile("goal-1", "Confirmation 2019", 3000, 40000, "2029-05-01T00:00:00.000Z", 0.05),
    ]);

    const goal = await repository.findById("goal-1");

    expect(goal?.goal.id).toBe("goal-1");
    expect(goal?.goal.name).toBe("Confirmation 2019");
  });

  it("findById returns null for unknown id", async () => {
    const repository = new InMemorySavingsGoalRepository();

    const goal = await repository.findById("missing-id");

    expect(goal).toBeNull();
  });

  it("save adds a new goal", async () => {
    const repository = new InMemorySavingsGoalRepository();

    await repository.save(
      createGoalProfile("goal-1", "Confirmation 2019", 3000, 40000, "2029-05-01T00:00:00.000Z", 0.05),
    );

    const goals = await repository.findAll();
    expect(goals).toHaveLength(1);
    expect(goals[0]?.goal.id).toBe("goal-1");
  });

  it("save updates existing goal by id (upsert contract)", async () => {
    const repository = new InMemorySavingsGoalRepository([
      createGoalProfile("goal-1", "Confirmation 2019", 3000, 40000, "2029-05-01T00:00:00.000Z", 0.05),
    ]);

    await repository.save(
      createGoalProfile("goal-1", "Confirmation 2019", 5000, 45000, "2029-05-01T00:00:00.000Z", 0.06),
    );

    const goal = await repository.findById("goal-1");
    expect(goal?.goal.currentAmount).toBe(5000);
    expect(goal?.goal.targetAmount).toBe(45000);
    expect(goal?.expectedAnnualReturn).toBe(0.06);
  });

  it("does not expose mutable internal state", async () => {
    const seed = [
      createGoalProfile("goal-1", "Confirmation 2019", 3000, 40000, "2029-05-01T00:00:00.000Z", 0.05),
    ];
    const repository = new InMemorySavingsGoalRepository(seed);

    const firstRead = await repository.findById("goal-1");
    expect(firstRead).not.toBeNull();

    if (firstRead) {
      firstRead.goal.currentAmount = 999999;
      firstRead.goal.targetDate.setUTCFullYear(2045);
    }

    const secondRead = await repository.findById("goal-1");
    expect(secondRead?.goal.currentAmount).toBe(3000);
    expect(secondRead?.goal.targetDate.toISOString()).toBe("2029-05-01T00:00:00.000Z");
  });
});