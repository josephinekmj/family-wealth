import { describe, expect, it } from "vitest";
import { createSavingsGoalCommands } from "../src/application/savings-goal-commands.js";
import { InMemorySavingsGoalRepository } from "../src/application/in-memory-savings-goal-repository.js";
import type { SavingsGoalProfile } from "../src/application/savings-goal-contracts.js";

function createValidGoal(overrides: Partial<SavingsGoalProfile> = {}): SavingsGoalProfile {
  const base: SavingsGoalProfile = {
    goal: {
      id: "goal-1",
      name: "Confirmation 2019",
      targetAmount: 40000,
      currentAmount: 3000,
      targetDate: new Date("2029-05-01T00:00:00.000Z"),
    },
    expectedAnnualReturn: 0.05,
  };

  return {
    ...base,
    ...overrides,
    goal: {
      ...base.goal,
      ...(overrides.goal ?? {}),
    },
  };
}

function createGoalWithOverrides(
  goalOverrides: Partial<SavingsGoalProfile["goal"]>,
  profileOverrides: Partial<Omit<SavingsGoalProfile, "goal">> = {},
): SavingsGoalProfile {
  return createValidGoal({
    ...profileOverrides,
    goal: {
      ...createValidGoal().goal,
      ...goalOverrides,
    },
  });
}

describe("savings goal commands integration", () => {
  it("valid new goal is saved", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await commands.saveSavingsGoal(createValidGoal());

    const all = await repository.findAll();
    expect(all).toHaveLength(1);
  });

  it("saved goal can be read back", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await commands.saveSavingsGoal(createValidGoal());

    const saved = await repository.findById("goal-1");
    expect(saved).not.toBeNull();
    expect(saved?.goal.name).toBe("Confirmation 2019");
  });

  it("same id updates existing goal", async () => {
    const repository = new InMemorySavingsGoalRepository([
      createValidGoal({
        goal: {
          id: "goal-1",
          name: "Confirmation 2019",
          targetAmount: 40000,
          currentAmount: 3000,
          targetDate: new Date("2029-05-01T00:00:00.000Z"),
        },
        expectedAnnualReturn: 0.05,
      }),
    ]);
    const commands = createSavingsGoalCommands(repository);

    await commands.saveSavingsGoal(
      createValidGoal({
        goal: {
          id: "goal-1",
          name: "Confirmation 2019",
          targetAmount: 45000,
          currentAmount: 5000,
          targetDate: new Date("2029-05-01T00:00:00.000Z"),
        },
        expectedAnnualReturn: 0.06,
      }),
    );

    const all = await repository.findAll();
    const saved = await repository.findById("goal-1");

    expect(all).toHaveLength(1);
    expect(saved?.goal.targetAmount).toBe(45000);
    expect(saved?.expectedAnnualReturn).toBe(0.06);
  });

  it("empty id is rejected", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await expect(
      commands.saveSavingsGoal(createGoalWithOverrides({ id: "   " })),
    ).rejects.toThrow(RangeError);

    expect(await repository.findAll()).toEqual([]);
  });

  it("empty name is rejected", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await expect(
      commands.saveSavingsGoal(createGoalWithOverrides({ name: "" })),
    ).rejects.toThrow(RangeError);

    expect(await repository.findAll()).toEqual([]);
  });

  it("targetAmount <= 0 is rejected", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await expect(
      commands.saveSavingsGoal(createGoalWithOverrides({ targetAmount: 0 })),
    ).rejects.toThrow(RangeError);

    await expect(
      commands.saveSavingsGoal(createGoalWithOverrides({ targetAmount: -1 })),
    ).rejects.toThrow(RangeError);

    expect(await repository.findAll()).toEqual([]);
  });

  it("negative currentAmount is rejected", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await expect(
      commands.saveSavingsGoal(createGoalWithOverrides({ currentAmount: -100 })),
    ).rejects.toThrow(RangeError);

    expect(await repository.findAll()).toEqual([]);
  });

  it("non-finite amounts are rejected", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await expect(
      commands.saveSavingsGoal(createGoalWithOverrides({ targetAmount: Number.NaN })),
    ).rejects.toThrow(RangeError);

    await expect(
      commands.saveSavingsGoal(createGoalWithOverrides({ currentAmount: Number.POSITIVE_INFINITY })),
    ).rejects.toThrow(RangeError);

    expect(await repository.findAll()).toEqual([]);
  });

  it("invalid targetDate is rejected", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await expect(
      commands.saveSavingsGoal(createGoalWithOverrides({ targetDate: new Date("invalid") })),
    ).rejects.toThrow(RangeError);

    expect(await repository.findAll()).toEqual([]);
  });

  it("expectedAnnualReturn <= -1 is rejected", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await expect(
      commands.saveSavingsGoal(createValidGoal({ expectedAnnualReturn: -1 })),
    ).rejects.toThrow(RangeError);

    await expect(
      commands.saveSavingsGoal(createValidGoal({ expectedAnnualReturn: -1.5 })),
    ).rejects.toThrow(RangeError);

    expect(await repository.findAll()).toEqual([]);
  });

  it("non-finite expectedAnnualReturn is rejected", async () => {
    const repository = new InMemorySavingsGoalRepository();
    const commands = createSavingsGoalCommands(repository);

    await expect(
      commands.saveSavingsGoal(createValidGoal({ expectedAnnualReturn: Number.NaN })),
    ).rejects.toThrow(RangeError);

    await expect(
      commands.saveSavingsGoal(createValidGoal({ expectedAnnualReturn: Number.POSITIVE_INFINITY })),
    ).rejects.toThrow(RangeError);

    expect(await repository.findAll()).toEqual([]);
  });
});