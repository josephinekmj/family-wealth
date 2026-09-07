import type { InvestmentAccountGateway } from "../application/investment-account-contracts.js";
import type { InvestmentBalanceGateway } from "../application/investment-balance-contracts.js";
import type { InvestmentPositionGateway } from "../application/investment-position-contracts.js";
import { MockInvestmentAccountGateway } from "../infrastructure/mock-investment-account-gateway.js";
import { MockInvestmentBalanceGateway } from "../infrastructure/mock-investment-balance-gateway.js";
import { MockInvestmentPositionGateway } from "../infrastructure/mock-investment-position-gateway.js";
import type { InvestmentConnectionStatus } from "./app.js";
import {
  InMemorySaxoOAuthStateStore,
  SaxoSimDeveloperAccessTokenProvider,
  SaxoSimAccessTokenProvider,
  type InvestmentAccountProviderConfiguration,
  type SaxoAuthorizationCodeReceiver,
  type SaxoOAuthStateStore,
  type SaxoSimConfiguration,
} from "../saxo/index.js";
import { SaxoInvestmentAccountGateway } from "../saxo/saxo-investment-account-gateway.js";
import { SaxoInvestmentBalanceGateway } from "../saxo/saxo-investment-balance-gateway.js";
import { SaxoInvestmentPositionGateway } from "../saxo/saxo-investment-position-gateway.js";

type SaxoFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type InvestmentAccountRuntime = {
  investmentAccountGateway: InvestmentAccountGateway;
  investmentBalanceGateway: InvestmentBalanceGateway;
  investmentPositionGateway: InvestmentPositionGateway;
  getInvestmentConnectionStatus: () => InvestmentConnectionStatus;
  saxoOAuth?: {
    configuration: SaxoSimConfiguration;
    stateStore: SaxoOAuthStateStore;
    authorizationCodeReceiver: SaxoAuthorizationCodeReceiver;
    generateState?: () => string;
  };
};

type InvestmentAccountCompositionOverrides = {
  tokenFetch?: SaxoFetch;
  accountFetch?: SaxoFetch;
  balanceFetch?: SaxoFetch;
  positionFetch?: SaxoFetch;
  stateStore?: SaxoOAuthStateStore;
  generateState?: () => string;
};

export const composeInvestmentAccountRuntime = (
  configuration: InvestmentAccountProviderConfiguration,
  overrides: InvestmentAccountCompositionOverrides = {},
): InvestmentAccountRuntime => {
  if (configuration.provider === "mock") {
    return {
      investmentAccountGateway: new MockInvestmentAccountGateway([
        { id: "mock-account-1", name: "Investment account", currency: "DKK" },
      ]),
      investmentBalanceGateway: new MockInvestmentBalanceGateway(),
      investmentPositionGateway: new MockInvestmentPositionGateway(),
      getInvestmentConnectionStatus: () => ({ source: "mock", status: "connected" }),
    };
  }

  if ("developerAccessToken" in configuration) {
    const tokenProvider = new SaxoSimDeveloperAccessTokenProvider(
      configuration.developerAccessToken,
    );
    return {
      investmentAccountGateway: new SaxoInvestmentAccountGateway(
        tokenProvider,
        overrides.accountFetch ?? globalThis.fetch,
      ),
      investmentBalanceGateway: new SaxoInvestmentBalanceGateway(
        tokenProvider,
        overrides.balanceFetch ?? globalThis.fetch,
      ),
      investmentPositionGateway: new SaxoInvestmentPositionGateway(
        tokenProvider,
        overrides.positionFetch ?? globalThis.fetch,
      ),
      getInvestmentConnectionStatus: () => ({ source: "saxo-sim", status: "connected" }),
    };
  }

  const tokenProvider = new SaxoSimAccessTokenProvider(
    configuration,
    overrides.tokenFetch ?? globalThis.fetch,
  );

  return {
    investmentAccountGateway: new SaxoInvestmentAccountGateway(
      tokenProvider,
      overrides.accountFetch ?? globalThis.fetch,
    ),
    investmentBalanceGateway: new SaxoInvestmentBalanceGateway(
      tokenProvider,
      overrides.balanceFetch ?? globalThis.fetch,
    ),
    investmentPositionGateway: new SaxoInvestmentPositionGateway(
      tokenProvider,
      overrides.positionFetch ?? globalThis.fetch,
    ),
    getInvestmentConnectionStatus: () => ({
      source: "saxo-sim",
      status: tokenProvider.hasAuthentication() ? "connected" : "not-connected",
    }),
    saxoOAuth: {
      configuration,
      stateStore: overrides.stateStore ?? new InMemorySaxoOAuthStateStore(),
      authorizationCodeReceiver: tokenProvider,
      ...(overrides.generateState === undefined ? {} : { generateState: overrides.generateState }),
    },
  };
};