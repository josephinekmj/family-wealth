import { afterEach, describe, expect, it } from "vitest";
import type { SavingsGoalProfile } from "../src/application/savings-goal-contracts.js";
import { SQLiteSavingsGoalRepository } from "../src/infrastructure/sqlite-savings-goal-repository.js";

function createGoal(overrides: Partial<SavingsGoalProfile> = {}): SavingsGoalProfile {
  const base: SavingsGoalProfile = {
    goal: {
      id: "goal-1",
      name: "Generic goal",
      targetAmount: 40000,
      currentAmount: 3000,
      targetDate: new Date("2033-05-01T00:00:00.000Z"),
    },
    expectedAnnualReturn: 0.04,
  };

  return {
    ...base,
    ...overrides,
    goal: { ...base.goal, ...(overrides.goal ?? {}) },
  };
}

describe("SQLiteSavingsGoalRepository", () => {
  let repository: SQLiteSavingsGoalRepository | undefined;

  afterEach(() => {
    repository?.close();
    repository = undefined;
  });

  function createRepository(): SQLiteSavingsGoalRepository {
    repository = new SQLiteSavingsGoalRepository(":memory:");
    return repository;
  }

  it("returns an empty list for a new database", async () => {
    expect(await createRepository().findAll()).toEqual([]);
  });

  it("returns saved goals from findAll", async () => {
    const currentRepository = createRepository();
    await currentRepository.save(createGoal());

    const goals = await currentRepository.findAll();

    expect(goals).toHaveLength(1);
    expect(goals[0]).toEqual(createGoal());
  });

  it("findById returns an existing goal", async () => {
    const currentRepository = createRepository();
    await currentRepository.save(createGoal());

    expect(await currentRepository.findById("goal-1")).toEqual(createGoal());
  });

  it("findById returns null for an unknown id", async () => {
    expect(await createRepository().findById("missing-goal")).toBeNull();
  });

  it("save inserts a new goal", async () => {
    const currentRepository = createRepository();

    await currentRepository.save(createGoal());

    expect(await currentRepository.findAll()).toHaveLength(1);
  });

  it("save updates an existing goal by id", async () => {
    const currentRepository = createRepository();
    await currentRepository.save(createGoal());

    const updated = createGoal({
      goal: { ...createGoal().goal, name: "Updated goal", currentAmount: 9000 },
      expectedAnnualReturn: 0.055,
    });
    await currentRepository.save(updated);

    expect(await currentRepository.findAll()).toHaveLength(1);
    expect(await currentRepository.findById("goal-1")).toEqual(updated);
  });

  it("round-trips dates and expected annual returns", async () => {
    const currentRepository = createRepository();
    const goal = createGoal({
      goal: {
        ...createGoal().goal,
        targetDate: new Date("2037-11-15T00:00:00.000Z"),
      },
      expectedAnnualReturn: 0.0375,
    });

    await currentRepository.save(goal);
    const saved = await currentRepository.findById("goal-1");

    expect(saved?.goal.targetDate.toISOString()).toBe("2037-11-15T00:00:00.000Z");
    expect(saved?.expectedAnnualReturn).toBe(0.0375);
  });

  it("does not expose mutable persisted state", async () => {
    const currentRepository = createRepository();
    const input = createGoal();
    await currentRepository.save(input);

    input.goal.currentAmount = 999999;
    input.goal.targetDate.setUTCFullYear(2045);
    const firstRead = await currentRepository.findById("goal-1");
    firstRead!.goal.currentAmount = 888888;
    firstRead!.goal.targetDate.setUTCFullYear(2046);

    expect(await currentRepository.findById("goal-1")).toEqual(createGoal());
  });
});
