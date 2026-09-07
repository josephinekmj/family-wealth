import { describe, expect, it } from "vitest";
import {
  SAXO_SIM_API_BASE_URL,
  SAXO_SIM_AUTHORIZATION_URL,
  SAXO_SIM_TOKEN_URL,
  loadInvestmentAccountProviderConfiguration,
} from "../src/saxo/index.js";

describe("Saxo SIM configuration", () => {
  it("uses the mock provider when no provider is configured", () => {
    expect(loadInvestmentAccountProviderConfiguration({})).toEqual({ provider: "mock" });
  });

  it("loads backend-only credentials for the SIM provider", () => {
    expect(
      loadInvestmentAccountProviderConfiguration({
        SAXO_MODE: "saxo-sim",
        SAXO_APP_KEY: "test-client-id",
        SAXO_APP_SECRET: "test-client-secret",
        SAXO_REDIRECT_URI: "http://127.0.0.1:3000/auth/saxo/callback",
      }),
    ).toEqual({
      provider: "saxo-sim",
      clientId: "test-client-id",
      clientSecret: "test-client-secret",
      redirectUri: "http://127.0.0.1:3000/auth/saxo/callback",
    });
  });

  it.each(["SAXO_APP_KEY", "SAXO_APP_SECRET", "SAXO_REDIRECT_URI"])(
    "rejects a missing %s without exposing configured secrets",
    (missingName) => {
      const environment: NodeJS.ProcessEnv = {
        SAXO_MODE: "saxo-sim",
        SAXO_APP_KEY: "private-client-id",
        SAXO_APP_SECRET: "private-client-secret",
        SAXO_REDIRECT_URI: "http://127.0.0.1:3000/auth/saxo/callback",
      };
      delete environment[missingName];

      expect(() => loadInvestmentAccountProviderConfiguration(environment)).toThrow(missingName);
      expect(() => loadInvestmentAccountProviderConfiguration(environment)).not.toThrow(
        /private-client-id|private-client-secret/,
      );
    },
  );

  it.each(["saxo-live", "live", "SAXO-SIM"])("rejects unsupported provider %s", (provider) => {
    expect(() =>
      loadInvestmentAccountProviderConfiguration({ SAXO_MODE: provider }),
    ).toThrow("LIVE is not supported");
  });

  it("exposes only SIM endpoints", () => {
    expect(SAXO_SIM_AUTHORIZATION_URL).toContain("sim.logonvalidation.net");
    expect(SAXO_SIM_TOKEN_URL).toContain("sim.logonvalidation.net");
    expect(SAXO_SIM_API_BASE_URL).toContain("/sim/openapi");
  });
});