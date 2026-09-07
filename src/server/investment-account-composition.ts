import type { InvestmentAccountGateway } from "../application/investment-account-contracts.js";
import { MockInvestmentAccountGateway } from "../infrastructure/mock-investment-account-gateway.js";
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

type SaxoFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type InvestmentAccountRuntime = {
  investmentAccountGateway: InvestmentAccountGateway;
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
    };
  }

  if ("developerAccessToken" in configuration) {
    return {
      investmentAccountGateway: new SaxoInvestmentAccountGateway(
        new SaxoSimDeveloperAccessTokenProvider(configuration.developerAccessToken),
        overrides.accountFetch ?? globalThis.fetch,
      ),
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
    saxoOAuth: {
      configuration,
      stateStore: overrides.stateStore ?? new InMemorySaxoOAuthStateStore(),
      authorizationCodeReceiver: tokenProvider,
      ...(overrides.generateState === undefined ? {} : { generateState: overrides.generateState }),
    },
  };
};