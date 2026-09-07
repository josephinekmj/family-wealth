import { describe, expect, it, vi } from "vitest";
import {
  SAXO_SIM_TOKEN_URL,
  SaxoSimAccessTokenProvider,
  type SaxoSimConfiguration,
} from "../src/saxo/index.js";

const configuration: SaxoSimConfiguration = {
  provider: "saxo-sim",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  redirectUri: "http://127.0.0.1:3000/auth/saxo/callback",
};

const tokenResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("SaxoSimAccessTokenProvider", () => {
  it("exchanges an authorization code using the SIM token endpoint and HTTP Basic", async () => {
    const fetchRequest = vi.fn<
      (input: string | URL, init?: RequestInit) => Promise<Response>
    >(async () =>
      tokenResponse({ access_token: "test-access-token", token_type: "Bearer", expires_in: 900 }),
    );
    const provider = new SaxoSimAccessTokenProvider(configuration, fetchRequest, () => 1_000);

    await provider.receive("test-authorization-code");

    expect(fetchRequest).toHaveBeenCalledOnce();
    const [url, init] = fetchRequest.mock.calls[0]!;
    const headers = new Headers(init?.headers);
    const body = new URLSearchParams(init?.body as URLSearchParams);
    const authorization = headers.get("Authorization")!;

    expect(url).toBe(SAXO_SIM_TOKEN_URL);
    expect(init?.method).toBe("POST");
    expect(headers.get("Content-Type")).toBe("application/x-www-form-urlencoded");
    expect(authorization.startsWith("Basic ")).toBe(true);
    expect(Buffer.from(authorization.slice("Basic ".length), "base64").toString("utf8")).toBe(
      "test-client-id:test-client-secret",
    );
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("test-authorization-code");
    expect(body.get("redirect_uri")).toBe(configuration.redirectUri);
    expect(body.has("client_secret")).toBe(false);
  });

  it("stores and returns an access token with deterministic expiry", async () => {
    const provider = new SaxoSimAccessTokenProvider(
      configuration,
      async () =>
        tokenResponse({ access_token: "test-access-token", token_type: "bearer", expires_in: 60 }),
      () => 5_000,
    );

    await provider.receive("test-code");

    expect(await provider.getAccessToken()).toEqual({
      value: "test-access-token",
      expiresAt: new Date(65_000),
    });
  });

  it("accepts optional refresh-token fields without exposing them", async () => {
    const provider = new SaxoSimAccessTokenProvider(
      configuration,
      async () =>
        tokenResponse({
          access_token: "test-access-token",
          token_type: "Bearer",
          expires_in: 60,
          refresh_token: "test-refresh-token",
          refresh_token_expires_in: 3600,
        }),
      () => 5_000,
    );

    await provider.receive("test-code");

    expect(await provider.getAccessToken()).toEqual({
      value: "test-access-token",
      expiresAt: new Date(65_000),
    });
  });

  it("rejects a blank authorization code before fetch", async () => {
    const fetchRequest = vi.fn(async () => tokenResponse({}));
    const provider = new SaxoSimAccessTokenProvider(configuration, fetchRequest);

    await expect(provider.receive("  ")).rejects.toThrow("Saxo SIM token exchange failed");
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it("rejects a non-success response without exposing its body", async () => {
    const provider = new SaxoSimAccessTokenProvider(
      configuration,
      async () => tokenResponse({ error: "raw-saxo-error", secret: "response-secret" }, 401),
    );

    await expect(provider.receive("sensitive-code")).rejects.toThrow(
      "Saxo SIM token exchange failed",
    );
    await expect(provider.receive("sensitive-code")).rejects.not.toThrow(
      /sensitive-code|raw-saxo-error|response-secret|test-client-secret/,
    );
  });

  it("rejects malformed JSON safely", async () => {
    const provider = new SaxoSimAccessTokenProvider(
      configuration,
      async () => new Response("not-json", { status: 200 }),
    );

    await expect(provider.receive("sensitive-code")).rejects.toThrow(
      "Saxo SIM token exchange failed",
    );
    await expect(provider.receive("sensitive-code")).rejects.not.toThrow(
      /sensitive-code|not-json|test-client-secret/,
    );
  });

  it.each([
    { access_token: "", token_type: "Bearer", expires_in: 60 },
    { token_type: "Bearer", expires_in: 60 },
    { access_token: "test-token", token_type: "Basic", expires_in: 60 },
    { access_token: "test-token", token_type: "Bearer", expires_in: 0 },
    { access_token: "test-token", token_type: "Bearer", expires_in: Number.NaN },
    { access_token: "test-token", token_type: "Bearer", expires_in: "60" },
  ])("rejects malformed token response %#", async (body) => {
    const provider = new SaxoSimAccessTokenProvider(
      configuration,
      async () => tokenResponse(body),
    );

    await expect(provider.receive("test-code")).rejects.toThrow(
      "Saxo SIM token exchange failed",
    );
  });

  it("rejects access before acquisition and at expiry", async () => {
    let now = 10_000;
    const provider = new SaxoSimAccessTokenProvider(
      configuration,
      async () =>
        tokenResponse({ access_token: "test-access-token", token_type: "Bearer", expires_in: 60 }),
      () => now,
    );

    await expect(provider.getAccessToken()).rejects.toThrow("Saxo access token is unavailable");
    await provider.receive("test-code");
    now = 69_999;
    await expect(provider.getAccessToken()).resolves.toEqual({
      value: "test-access-token",
      expiresAt: new Date(70_000),
    });
    now = 70_000;
    await expect(provider.getAccessToken()).rejects.toThrow("Saxo access token is unavailable");
  });
});