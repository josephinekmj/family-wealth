import Fastify from "fastify";
import {
  createInvestmentAccountQueries,
  createSavingsGoalCommands,
  createSavingsGoalQueries,
  InMemorySavingsGoalRepository,
  mapRecordToSavingsGoalProfile,
  mapSavingsGoalProfileToRecord,
  type InvestmentAccountGateway,
  type SavingsGoalRecord,
  type SavingsGoalRepository,
} from "../application/index.js";
import { MockInvestmentAccountGateway } from "../infrastructure/mock-investment-account-gateway.js";
import { DEMO_SAVINGS_GOALS } from "./demo-savings-goals.js";

type SavingsGoalBody = Omit<SavingsGoalRecord, "id">;

const savingsGoalBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "targetAmount", "currentAmount", "targetDate", "expectedAnnualReturn"],
  properties: {
    name: { type: "string" },
    targetAmount: { type: "number" },
    currentAmount: { type: "number" },
    targetDate: { type: "string" },
    expectedAnnualReturn: { type: "number" },
  },
} as const;

export type BuildServerDependencies = {
  savingsGoalRepository?: SavingsGoalRepository;
  investmentAccountGateway?: InvestmentAccountGateway;
};

export function buildServer(dependencies: BuildServerDependencies = {}) {
  const app = Fastify({
    logger: false,
    ajv: {
      customOptions: {
        coerceTypes: false,
        removeAdditional: false,
      },
    },
  });
  const savingsGoalRepository =
    dependencies.savingsGoalRepository ?? new InMemorySavingsGoalRepository(DEMO_SAVINGS_GOALS);
  const savingsGoalQueries = createSavingsGoalQueries(savingsGoalRepository);
  const savingsGoalCommands = createSavingsGoalCommands(savingsGoalRepository);
  const investmentAccountGateway =
    dependencies.investmentAccountGateway ??
    new MockInvestmentAccountGateway([
      { id: "mock-account-1", name: "Investment account", currency: "DKK" },
    ]);
  const investmentAccountQueries = createInvestmentAccountQueries(investmentAccountGateway);

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/api/goals", async () => {
    const goals = await savingsGoalQueries.listSavingsGoals();
    return goals.map(mapSavingsGoalProfileToRecord);
  });

  app.get("/api/investment-accounts", async () => {
    const accounts = await investmentAccountQueries.listInvestmentAccounts();
    return accounts.map(({ id, name, currency }) => ({ id, name, currency }));
  });

  app.put<{ Params: { id: string }; Body: SavingsGoalBody }>(
    "/api/goals/:id",
    { schema: { body: savingsGoalBodySchema } },
    async (request, reply) => {
      try {
        const profile = mapRecordToSavingsGoalProfile({
          id: request.params.id,
          ...request.body,
        });
        await savingsGoalCommands.saveSavingsGoal(profile);
        return reply.status(204).send();
      } catch (error) {
        if (error instanceof RangeError) {
          return reply.status(400).send({ error: "Invalid savings goal" });
        }

        throw error;
      }
    },
  );

  app.setErrorHandler((error, _request, reply) => {
    if (typeof error === "object" && error !== null && "validation" in error) {
      return reply.status(400).send({ error: "Invalid savings goal" });
    }

    return reply.send(error);
  });

  return app;
}
