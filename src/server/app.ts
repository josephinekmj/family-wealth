import Fastify from "fastify";
import {
  createSavingsGoalQueries,
  InMemorySavingsGoalRepository,
  mapSavingsGoalProfileToRecord,
  type SavingsGoalQueries,
} from "../application/index.js";
import { DEMO_SAVINGS_GOALS } from "./demo-savings-goals.js";

export type BuildServerDependencies = {
  savingsGoalQueries?: SavingsGoalQueries;
};

export function buildServer(dependencies: BuildServerDependencies = {}) {
  const app = Fastify({ logger: false });
  const savingsGoalQueries =
    dependencies.savingsGoalQueries ??
    createSavingsGoalQueries(new InMemorySavingsGoalRepository(DEMO_SAVINGS_GOALS));

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/api/goals", async () => {
    const goals = await savingsGoalQueries.listSavingsGoals();
    return goals.map(mapSavingsGoalProfileToRecord);
  });

  return app;
}