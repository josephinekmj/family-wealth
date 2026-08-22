import {
  type SavingsGoalProfile,
  type SavingsGoalRepository,
} from "./savings-goal-contracts.js";

export class InMemorySavingsGoalRepository implements SavingsGoalRepository {
  private readonly store = new Map<string, SavingsGoalProfile>();

  constructor(seedData: SavingsGoalProfile[] = []) {
    for (const item of seedData) {
      const safeItem = cloneSavingsGoalProfile(item);
      this.store.set(safeItem.goal.id, safeItem);
    }
  }

  async findAll(): Promise<SavingsGoalProfile[]> {
    return Array.from(this.store.values(), (value) => cloneSavingsGoalProfile(value));
  }

  async findById(id: string): Promise<SavingsGoalProfile | null> {
    const value = this.store.get(id);

    return value ? cloneSavingsGoalProfile(value) : null;
  }

  async save(goal: SavingsGoalProfile): Promise<void> {
    const safeGoal = cloneSavingsGoalProfile(goal);
    this.store.set(safeGoal.goal.id, safeGoal);
  }
}

function cloneSavingsGoalProfile(profile: SavingsGoalProfile): SavingsGoalProfile {
  return {
    goal: {
      id: profile.goal.id,
      name: profile.goal.name,
      targetAmount: profile.goal.targetAmount,
      currentAmount: profile.goal.currentAmount,
      targetDate: new Date(profile.goal.targetDate.getTime()),
    },
    expectedAnnualReturn: profile.expectedAnnualReturn,
  };
}