import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildServer } from "./app.js";
import { DEMO_SAVINGS_GOALS } from "./demo-savings-goals.js";
import { composeInvestmentAccountRuntime } from "./investment-account-composition.js";
import { SQLiteSavingsGoalRepository } from "../infrastructure/sqlite-savings-goal-repository.js";
import { loadInvestmentAccountProviderConfiguration } from "../saxo/index.js";

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? "127.0.0.1";

const databasePath = resolve(".data/family-wealth.sqlite");
const isFirstRun = !existsSync(databasePath);
const savingsGoalRepository = new SQLiteSavingsGoalRepository(databasePath);
const investmentAccountProviderConfiguration =
  loadInvestmentAccountProviderConfiguration(process.env);
const investmentAccountRuntime = composeInvestmentAccountRuntime(
  investmentAccountProviderConfiguration,
);

if (isFirstRun && (await savingsGoalRepository.findAll()).length === 0) {
  for (const goal of DEMO_SAVINGS_GOALS) {
    await savingsGoalRepository.save(goal);
  }
}

const app = buildServer({
  savingsGoalRepository,
  ...investmentAccountRuntime,
});
app.addHook("onClose", async () => {
  savingsGoalRepository.close();
});

const shutdown = async () => {
  await app.close();
};

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());

try {
  await app.listen({ port, host });
  app.log.info(`Server listening on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  savingsGoalRepository.close();
  process.exit(1);
}
