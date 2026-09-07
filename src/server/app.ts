import Fastify from "fastify";
import {
  createInvestmentAccountQueries,
  createInvestmentBalanceQueries,
  createInvestmentPositionQueries,
  createSavingsGoalCommands,
  createSavingsGoalQueries,
  InMemorySavingsGoalRepository,
  mapRecordToSavingsGoalProfile,
  mapSavingsGoalProfileToRecord,
  type InvestmentAccountGateway,
  type InvestmentBalanceGateway,
  type InvestmentPositionGateway,
  type SavingsGoalRecord,
  type SavingsGoalRepository,
} from "../application/index.js";
import { MockInvestmentAccountGateway } from "../infrastructure/mock-investment-account-gateway.js";
import { MockInvestmentBalanceGateway } from "../infrastructure/mock-investment-balance-gateway.js";
import { MockInvestmentPositionGateway } from "../infrastructure/mock-investment-position-gateway.js";
import {
  buildSaxoSimAuthorizationUrl,
  generateSaxoOAuthState,
  type SaxoAuthorizationCodeReceiver,
  type SaxoOAuthStateStore,
  type SaxoSimConfiguration,
} from "../saxo/index.js";
import { DEMO_SAVINGS_GOALS } from "./demo-savings-goals.js";

type SavingsGoalBody = Omit<SavingsGoalRecord, "id">;
type SaxoOAuthCallbackQuery = {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
};

export type InvestmentConnectionStatus = {
  source: "mock" | "saxo-sim";
  status: "connected" | "not-connected";
};

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
  investmentBalanceGateway?: InvestmentBalanceGateway;
  investmentPositionGateway?: InvestmentPositionGateway;
  getInvestmentConnectionStatus?: () => InvestmentConnectionStatus;
  saxoOAuth?: {
    configuration: SaxoSimConfiguration;
    stateStore: SaxoOAuthStateStore;
    authorizationCodeReceiver: SaxoAuthorizationCodeReceiver;
    generateState?: () => string;
  };
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
  const investmentBalanceQueries = createInvestmentBalanceQueries(
    dependencies.investmentBalanceGateway ?? new MockInvestmentBalanceGateway(),
  );
  const investmentPositionQueries = createInvestmentPositionQueries(
    dependencies.investmentPositionGateway ?? new MockInvestmentPositionGateway(),
  );

  app.get("/health", async () => {
    return { status: "ok" };
  });

  app.get("/api/goals", async () => {
    const goals = await savingsGoalQueries.listSavingsGoals();
    return goals.map(mapSavingsGoalProfileToRecord);
  });

  app.get("/api/investment-accounts", async (_request, reply) => {
    try {
      const accounts = await investmentAccountQueries.listInvestmentAccounts();
      return accounts.map(({ id, name, currency }) => ({ id, name, currency }));
    } catch {
      return reply.status(503).send({ error: "Investment accounts are not available" });
    }
  });

  app.get("/api/investment-accounts/status", async () => {
    return (
      dependencies.getInvestmentConnectionStatus?.() ?? {
        source: "mock",
        status: "connected",
      }
    );
  });

  app.get("/api/investment-balance", async (_request, reply) => {
    try {
      const { currency, cashBalance, totalValue } =
        await investmentBalanceQueries.getInvestmentBalance();
      return { currency, cashBalance, totalValue };
    } catch {
      return reply.status(503).send({ error: "Investment balance is not available" });
    }
  });

  app.get("/api/investment-positions", async (_request, reply) => {
    try {
      const positions = await investmentPositionQueries.listInvestmentPositions();
      return positions.map(
        ({
          id,
          instrumentName,
          symbol,
          assetType,
          amount,
          currentPrice,
          exposure,
          exposureCurrency,
        }) => ({
          id,
          instrumentName,
          symbol,
          assetType,
          amount,
          currentPrice,
          exposure,
          exposureCurrency,
        }),
      );
    } catch {
      return reply.status(503).send({ error: "Investment positions are not available" });
    }
  });

  if (dependencies.saxoOAuth) {
    const {
      configuration,
      stateStore,
      authorizationCodeReceiver,
      generateState = generateSaxoOAuthState,
    } = dependencies.saxoOAuth;

    app.get("/auth/saxo/start", async (_request, reply) => {
      try {
        const state = generateState();
        stateStore.save(state);
        return reply.redirect(buildSaxoSimAuthorizationUrl(configuration, state));
      } catch {
        return reply.status(500).send({ error: "Unable to start Saxo authorization" });
      }
    });

    app.get<{ Querystring: SaxoOAuthCallbackQuery }>(
      "/auth/saxo/callback",
      async (request, reply) => {
        try {
          const { code, state, error } = request.query;

          if (typeof state !== "string" || !state.trim() || !stateStore.consume(state)) {
            return reply.status(400).send({ error: "Invalid Saxo authorization callback" });
          }

          if (typeof error === "string" && error.trim()) {
            return reply.status(400).send({ error: "Saxo authorization was not completed" });
          }

          if (typeof code !== "string" || !code.trim()) {
            return reply.status(400).send({ error: "Invalid Saxo authorization callback" });
          }

          await authorizationCodeReceiver.receive(code);
          return { status: "Saxo authorization code received" };
        } catch {
          return reply.status(500).send({ error: "Unable to complete Saxo authorization" });
        }
      },
    );
  }

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
