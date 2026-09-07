import { describe, expect, it } from "vitest";
import {
  SAXO_SIM_API_BASE_URL,
  SAXO_SIM_AUTHORIZATION_URL,
  SAXO_SIM_TOKEN_URL,
  buildSaxoSimAuthorizationUrl,
  generateSaxoOAuthState,
  loadInvestmentAccountProviderConfiguration,
  SaxoSimDeveloperAccessTokenProvider,
  type SaxoSimConfiguration,
} from "../src/saxo/index.js";

const simConfiguration: SaxoSimConfiguration = {
  provider: "saxo-sim",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  redirectUri: "http://127.0.0.1:3000/auth/saxo/callback",
};

describe("Saxo SIM configuration", () => {
  it("uses the mock provider when no provider is configured", () => {
    expect(loadInvestmentAccountProviderConfiguration({})).toEqual({ provider: "mock" });
  });

  it("loads backend-only credentials for the SIM provider", () => {
    expect(
      loadInvestmentAccountProviderConfiguration({
        SAXO_MODE: "saxo-sim",
        SAXO_SIM_APP_KEY: "test-client-id",
        SAXO_SIM_APP_SECRET: "test-client-secret",
        SAXO_SIM_REDIRECT_URI: "http://127.0.0.1:3000/auth/saxo/callback",
      }),
    ).toEqual(simConfiguration);
  });

  it("loads a developer token without OAuth configuration", () => {
    expect(
      loadInvestmentAccountProviderConfiguration({
        SAXO_MODE: "saxo-sim",
        SAXO_SIM_DEVELOPER_ACCESS_TOKEN: "test-developer-token",
      }),
    ).toEqual({ provider: "saxo-sim", developerAccessToken: "test-developer-token" });
  });

  it("treats a blank developer token as absent and loads OAuth configuration", () => {
    expect(
      loadInvestmentAccountProviderConfiguration({
        SAXO_MODE: "saxo-sim",
        SAXO_SIM_DEVELOPER_ACCESS_TOKEN: "  ",
        SAXO_SIM_APP_KEY: "test-client-id",
        SAXO_SIM_APP_SECRET: "test-client-secret",
        SAXO_SIM_REDIRECT_URI: "http://127.0.0.1:3000/auth/saxo/callback",
      }),
    ).toEqual(simConfiguration);
  });

  it.each(["SAXO_SIM_APP_KEY", "SAXO_SIM_APP_SECRET", "SAXO_SIM_REDIRECT_URI"])(
    "rejects a developer token combined with %s without exposing secrets",
    (oauthName) => {
      const environment: NodeJS.ProcessEnv = {
        SAXO_MODE: "saxo-sim",
        SAXO_SIM_DEVELOPER_ACCESS_TOKEN: "private-developer-token",
        [oauthName]: "private-oauth-value",
      };
      const loadConfiguration = () => loadInvestmentAccountProviderConfiguration(environment);

      expect(loadConfiguration).toThrow("Saxo SIM authentication configuration is ambiguous");
      expect(loadConfiguration).not.toThrow(/private-developer-token|private-oauth-value/);
    },
  );

  it("accepts and normalizes an HTTPS redirect URI", () => {
    const configuration = loadInvestmentAccountProviderConfiguration({
      SAXO_MODE: "saxo-sim",
      SAXO_SIM_APP_KEY: "test-client-id",
      SAXO_SIM_APP_SECRET: "test-client-secret",
      SAXO_SIM_REDIRECT_URI: "https://example.test/oauth/callback",
    });

    expect(configuration).toMatchObject({
      provider: "saxo-sim",
      redirectUri: "https://example.test/oauth/callback",
    });
  });

  it.each(["not a URI", "://missing-scheme.example"])(
    "rejects malformed redirect URI %s without exposing the secret",
    (redirectUri) => {
      const loadConfiguration = () =>
        loadInvestmentAccountProviderConfiguration({
          SAXO_MODE: "saxo-sim",
          SAXO_SIM_APP_KEY: "test-client-id",
          SAXO_SIM_APP_SECRET: "private-client-secret",
          SAXO_SIM_REDIRECT_URI: redirectUri,
        });

      expect(loadConfiguration).toThrow("SAXO_SIM_REDIRECT_URI");
      expect(loadConfiguration).not.toThrow("private-client-secret");
    },
  );

  it("rejects a redirect URI with an unsupported protocol", () => {
    expect(() =>
      loadInvestmentAccountProviderConfiguration({
        SAXO_MODE: "saxo-sim",
        SAXO_SIM_APP_KEY: "test-client-id",
        SAXO_SIM_APP_SECRET: "private-client-secret",
        SAXO_SIM_REDIRECT_URI: "ftp://example.test/oauth/callback",
      }),
    ).toThrow("must use HTTP or HTTPS");
  });

  it.each(["SAXO_SIM_APP_KEY", "SAXO_SIM_APP_SECRET", "SAXO_SIM_REDIRECT_URI"])(
    "rejects a missing %s without exposing configured secrets",
    (missingName) => {
      const environment: NodeJS.ProcessEnv = {
        SAXO_MODE: "saxo-sim",
        SAXO_SIM_APP_KEY: "private-client-id",
        SAXO_SIM_APP_SECRET: "private-client-secret",
        SAXO_SIM_REDIRECT_URI: "http://127.0.0.1:3000/auth/saxo/callback",
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

describe("Saxo SIM authorization URL", () => {
  it("builds an authorization request containing only the required values", () => {
    const state = "state_value-123";
    const authorizationUrl = new URL(buildSaxoSimAuthorizationUrl(simConfiguration, state));

    expect(`${authorizationUrl.origin}${authorizationUrl.pathname}`).toBe(
      SAXO_SIM_AUTHORIZATION_URL,
    );
    expect(authorizationUrl.searchParams.get("response_type")).toBe("code");
    expect(authorizationUrl.searchParams.get("client_id")).toBe(simConfiguration.clientId);
    expect(authorizationUrl.searchParams.get("state")).toBe(state);
    expect(authorizationUrl.searchParams.get("redirect_uri")).toBe(
      simConfiguration.redirectUri,
    );
    expect(authorizationUrl.searchParams.has("scope")).toBe(false);
    expect(authorizationUrl.toString()).not.toContain(simConfiguration.clientSecret);
    expect([...authorizationUrl.searchParams.keys()].sort()).toEqual([
      "client_id",
      "redirect_uri",
      "response_type",
      "state",
    ]);
  });

  it.each(["", " ", "\t\n"])("rejects blank state %j", (state) => {
    expect(() => buildSaxoSimAuthorizationUrl(simConfiguration, state)).toThrow(
      "OAuth state must not be blank",
    );
  });
});

describe("Saxo OAuth state", () => {
  it("generates nonempty URL-safe state", () => {
    expect(generateSaxoOAuthState()).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates different values", () => {
    expect(generateSaxoOAuthState()).not.toBe(generateSaxoOAuthState());
  });
});

describe("SaxoSimDeveloperAccessTokenProvider", () => {
  it("returns the supplied token with unknown expiry", async () => {
    const provider = new SaxoSimDeveloperAccessTokenProvider("test-developer-token");

    await expect(provider.getAccessToken()).resolves.toEqual({
      value: "test-developer-token",
      expiresAt: null,
    });
  });

  it.each(["", " ", "\t\n"])("rejects blank token %j", (token) => {
    expect(() => new SaxoSimDeveloperAccessTokenProvider(token)).toThrow(
      "Saxo SIM developer access token is required",
    );
  });
});