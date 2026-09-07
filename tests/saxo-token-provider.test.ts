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

  it("refreshes an expired access token once using the current refresh token", async () => {
    let now = 10_000;
    const fetchRequest = vi
      .fn<(input: string | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        tokenResponse({
          access_token: "first-access-token",
          token_type: "Bearer",
          expires_in: 60,
          refresh_token: "first-refresh-token",
          refresh_token_expires_in: 3600,
        }),
      )
      .mockResolvedValueOnce(
        tokenResponse({
          access_token: "second-access-token",
          token_type: "Bearer",
          expires_in: 120,
          refresh_token: "second-refresh-token",
          refresh_token_expires_in: 7200,
        }),
      );
    const provider = new SaxoSimAccessTokenProvider(configuration, fetchRequest, () => now);
    await provider.receive("test-code");
    now = 70_000;

    await expect(provider.getAccessToken()).resolves.toEqual({
      value: "second-access-token",
      expiresAt: new Date(190_000),
    });

    expect(fetchRequest).toHaveBeenCalledTimes(2);
    const [refreshUrl, refreshInit] = fetchRequest.mock.calls[1]!;
    const refreshHeaders = new Headers(refreshInit?.headers);
    const refreshBody = new URLSearchParams(refreshInit?.body as URLSearchParams);
    expect(refreshUrl).toBe(SAXO_SIM_TOKEN_URL);
    expect(refreshInit?.method).toBe("POST");
    expect(refreshHeaders.get("Authorization")).toBe(
      `Basic ${Buffer.from("test-client-id:test-client-secret", "utf8").toString("base64")}`,
    );
    expect(refreshBody.get("grant_type")).toBe("refresh_token");
    expect(refreshBody.get("refresh_token")).toBe("first-refresh-token");
    expect(refreshBody.has("code")).toBe(false);
    expect(refreshBody.has("redirect_uri")).toBe(false);
    expect(refreshBody.has("client_secret")).toBe(false);
  });

  it("rotates the refresh token used by the next refresh", async () => {
    let now = 0;
    const fetchRequest = vi
      .fn<(input: string | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        tokenResponse({
          access_token: "access-one",
          token_type: "Bearer",
          expires_in: 10,
          refresh_token: "refresh-one",
        }),
      )
      .mockResolvedValueOnce(
        tokenResponse({
          access_token: "access-two",
          token_type: "Bearer",
          expires_in: 10,
          refresh_token: "refresh-two",
        }),
      )
      .mockResolvedValueOnce(
        tokenResponse({
          access_token: "access-three",
          token_type: "Bearer",
          expires_in: 10,
          refresh_token: "refresh-three",
        }),
      );
    const provider = new SaxoSimAccessTokenProvider(configuration, fetchRequest, () => now);
    await provider.receive("test-code");

    now = 10_000;
    await provider.getAccessToken();
    now = 20_000;
    await provider.getAccessToken();

    const secondRefreshBody = new URLSearchParams(
      fetchRequest.mock.calls[2]![1]?.body as URLSearchParams,
    );
    expect(secondRefreshBody.get("refresh_token")).toBe("refresh-two");
  });

  it("does not refresh while the access token is valid", async () => {
    const fetchRequest = vi.fn(async () =>
      tokenResponse({
        access_token: "valid-access-token",
        token_type: "Bearer",
        expires_in: 60,
        refresh_token: "unused-refresh-token",
      }),
    );
    const provider = new SaxoSimAccessTokenProvider(configuration, fetchRequest, () => 1_000);
    await provider.receive("test-code");

    await expect(provider.getAccessToken()).resolves.toMatchObject({
      value: "valid-access-token",
    });
    expect(fetchRequest).toHaveBeenCalledOnce();
  });

  it.each([
    {
      name: "missing",
      refreshFields: {},
      now: 60_000,
    },
    {
      name: "expired",
      refreshFields: { refresh_token: "expired-refresh-token", refresh_token_expires_in: 60 },
      now: 60_000,
    },
  ])("rejects an expired access token with a $name refresh token", async ({ refreshFields, now }) => {
    let currentTime = 0;
    const fetchRequest = vi.fn(async () =>
      tokenResponse({
        access_token: "expired-access-token",
        token_type: "Bearer",
        expires_in: 60,
        ...refreshFields,
      }),
    );
    const provider = new SaxoSimAccessTokenProvider(
      configuration,
      fetchRequest,
      () => currentTime,
    );
    await provider.receive("test-code");
    currentTime = now;

    await expect(provider.getAccessToken()).rejects.toThrow("Saxo access token is unavailable");
    expect(fetchRequest).toHaveBeenCalledOnce();
  });

  it("coalesces concurrent refresh callers into one request", async () => {
    let now = 0;
    let resolveRefresh!: (response: Response) => void;
    const refreshResponse = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchRequest = vi
      .fn<(input: string | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        tokenResponse({
          access_token: "expired-access-token",
          token_type: "Bearer",
          expires_in: 10,
          refresh_token: "test-refresh-token",
        }),
      )
      .mockReturnValueOnce(refreshResponse);
    const provider = new SaxoSimAccessTokenProvider(configuration, fetchRequest, () => now);
    await provider.receive("test-code");
    now = 10_000;

    const firstAccess = provider.getAccessToken();
    const secondAccess = provider.getAccessToken();
    expect(fetchRequest).toHaveBeenCalledTimes(2);

    resolveRefresh(
      tokenResponse({
        access_token: "refreshed-access-token",
        token_type: "Bearer",
        expires_in: 60,
        refresh_token: "rotated-refresh-token",
      }),
    );

    await expect(Promise.all([firstAccess, secondAccess])).resolves.toEqual([
      { value: "refreshed-access-token", expiresAt: new Date(70_000) },
      { value: "refreshed-access-token", expiresAt: new Date(70_000) },
    ]);
    expect(fetchRequest).toHaveBeenCalledTimes(2);
  });

  it("keeps the previous token state when refresh validation fails", async () => {
    let now = 0;
    const fetchRequest = vi
      .fn<(input: string | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        tokenResponse({
          access_token: "expired-access-token",
          token_type: "Bearer",
          expires_in: 10,
          refresh_token: "original-refresh-token",
        }),
      )
      .mockResolvedValueOnce(
        tokenResponse({ access_token: "invalid-new-access", token_type: "Bearer", expires_in: 60 }),
      )
      .mockResolvedValueOnce(
        tokenResponse({
          access_token: "valid-new-access",
          token_type: "Bearer",
          expires_in: 60,
          refresh_token: "valid-new-refresh",
        }),
      );
    const provider = new SaxoSimAccessTokenProvider(configuration, fetchRequest, () => now);
    await provider.receive("test-code");
    now = 10_000;

    await expect(provider.getAccessToken()).rejects.toThrow("Saxo SIM token refresh failed");
    await expect(provider.getAccessToken()).resolves.toMatchObject({ value: "valid-new-access" });

    const retryBody = new URLSearchParams(fetchRequest.mock.calls[2]![1]?.body as URLSearchParams);
    expect(retryBody.get("refresh_token")).toBe("original-refresh-token");
  });
});