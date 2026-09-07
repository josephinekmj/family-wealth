import { describe, expect, it, vi } from "vitest";
import type {
  SaxoAuthorizationCodeReceiver,
  SaxoOAuthStateStore,
  SaxoSimConfiguration,
} from "../src/saxo/index.js";
import {
  InMemorySaxoOAuthStateStore,
  SaxoSimAccessTokenProvider,
} from "../src/saxo/index.js";
import { buildServer } from "../src/server/app.js";

const configuration: SaxoSimConfiguration = {
  provider: "saxo-sim",
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  redirectUri: "http://127.0.0.1:3000/auth/saxo/callback",
};

const createCodeReceiver = () => {
  const receive = vi.fn(async () => undefined);
  return { receiver: { receive } satisfies SaxoAuthorizationCodeReceiver, receive };
};

describe("Saxo SIM OAuth routes", () => {
  it("does not register OAuth routes by default", async () => {
    const app = buildServer();

    try {
      expect((await app.inject({ method: "GET", url: "/auth/saxo/start" })).statusCode).toBe(404);
      expect(
        (await app.inject({ method: "GET", url: "/auth/saxo/callback" })).statusCode,
      ).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("starts authorization with a stored state and SIM redirect", async () => {
    const save = vi.fn(() => undefined);
    const stateStore: SaxoOAuthStateStore = { save, consume: () => false };
    const { receiver } = createCodeReceiver();
    const app = buildServer({
      saxoOAuth: {
        configuration,
        stateStore,
        authorizationCodeReceiver: receiver,
        generateState: () => "generated-state_123",
      },
    });

    try {
      const response = await app.inject({ method: "GET", url: "/auth/saxo/start" });
      const location = new URL(response.headers.location!);

      expect(response.statusCode).toBe(302);
      expect(`${location.origin}${location.pathname}`).toBe(
        "https://sim.logonvalidation.net/authorize",
      );
      expect(location.searchParams.get("response_type")).toBe("code");
      expect(location.searchParams.get("client_id")).toBe(configuration.clientId);
      expect(location.searchParams.get("redirect_uri")).toBe(configuration.redirectUri);
      expect(location.searchParams.get("state")).toBe("generated-state_123");
      expect(location.toString()).not.toContain(configuration.clientSecret);
      expect(save).toHaveBeenCalledExactlyOnceWith("generated-state_123");
    } finally {
      await app.close();
    }
  });

  it("accepts a valid callback without returning its sensitive values", async () => {
    const stateStore = new InMemorySaxoOAuthStateStore();
    stateStore.save("valid-state");
    const { receiver, receive } = createCodeReceiver();
    const app = buildServer({
      saxoOAuth: { configuration, stateStore, authorizationCodeReceiver: receiver },
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=test-code&state=valid-state",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "Saxo authorization code received" });
      expect(response.body).not.toContain("test-code");
      expect(response.body).not.toContain("valid-state");
      expect(receive).toHaveBeenCalledExactlyOnceWith("test-code");
    } finally {
      await app.close();
    }
  });

  it("exchanges a valid callback code and returns no token details", async () => {
    const stateStore = new InMemorySaxoOAuthStateStore();
    stateStore.save("exchange-state");
    const fetchRequest = vi.fn(async () =>
      new Response(
        JSON.stringify({
          access_token: "test-access-token",
          token_type: "Bearer",
          expires_in: 900,
          refresh_token: "test-refresh-token",
          refresh_token_expires_in: 3600,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    const tokenProvider = new SaxoSimAccessTokenProvider(configuration, fetchRequest);
    const app = buildServer({
      saxoOAuth: {
        configuration,
        stateStore,
        authorizationCodeReceiver: tokenProvider,
      },
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=test-code&state=exchange-state",
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: "Saxo authorization code received" });
      expect(response.body).not.toMatch(/test-code|exchange-state|test-access-token|test-refresh-token/);
      expect(fetchRequest).toHaveBeenCalledOnce();
      await expect(tokenProvider.getAccessToken()).resolves.toMatchObject({
        value: "test-access-token",
      });
    } finally {
      await app.close();
    }
  });

  it.each(["/auth/saxo/callback", "/auth/saxo/callback?state=&code=test-code"])(
    "rejects missing or blank state at %s",
    async (url) => {
      const { receiver, receive } = createCodeReceiver();
      const app = buildServer({
        saxoOAuth: {
          configuration,
          stateStore: new InMemorySaxoOAuthStateStore(),
          authorizationCodeReceiver: receiver,
        },
      });

      try {
        const response = await app.inject({ method: "GET", url });

        expect(response.statusCode).toBe(400);
        expect(response.json()).toEqual({ error: "Invalid Saxo authorization callback" });
        expect(receive).not.toHaveBeenCalled();
      } finally {
        await app.close();
      }
    },
  );

  it("rejects an unknown state without capturing a code", async () => {
    const { receiver, receive } = createCodeReceiver();
    const app = buildServer({
      saxoOAuth: {
        configuration,
        stateStore: new InMemorySaxoOAuthStateStore(),
        authorizationCodeReceiver: receiver,
      },
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=test-code&state=unknown-state",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Invalid Saxo authorization callback" });
      expect(receive).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("rejects an expired state without capturing a code", async () => {
    let now = 1_000;
    const stateStore = new InMemorySaxoOAuthStateStore(10 * 60 * 1000, () => now);
    stateStore.save("expired-state");
    now += 10 * 60 * 1000;
    const { receiver, receive } = createCodeReceiver();
    const app = buildServer({
      saxoOAuth: { configuration, stateStore, authorizationCodeReceiver: receiver },
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=test-code&state=expired-state",
      });

      expect(response.statusCode).toBe(400);
      expect(receive).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("rejects a replayed state even when the code changes", async () => {
    const stateStore = new InMemorySaxoOAuthStateStore();
    stateStore.save("one-time-state");
    const { receiver, receive } = createCodeReceiver();
    const app = buildServer({
      saxoOAuth: { configuration, stateStore, authorizationCodeReceiver: receiver },
    });

    try {
      const firstResponse = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=first-code&state=one-time-state",
      });
      const replayResponse = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=second-code&state=one-time-state",
      });

      expect(firstResponse.statusCode).toBe(200);
      expect(replayResponse.statusCode).toBe(400);
      expect(receive).toHaveBeenCalledExactlyOnceWith("first-code");
    } finally {
      await app.close();
    }
  });

  it("consumes a valid state before rejecting a missing code", async () => {
    const stateStore = new InMemorySaxoOAuthStateStore();
    stateStore.save("code-required-state");
    const { receiver, receive } = createCodeReceiver();
    const app = buildServer({
      saxoOAuth: { configuration, stateStore, authorizationCodeReceiver: receiver },
    });

    try {
      const missingCodeResponse = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?state=code-required-state",
      });
      const replayResponse = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=later-code&state=code-required-state",
      });

      expect(missingCodeResponse.statusCode).toBe(400);
      expect(missingCodeResponse.json()).toEqual({
        error: "Invalid Saxo authorization callback",
      });
      expect(replayResponse.statusCode).toBe(400);
      expect(receive).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });

  it("returns a generic denial after consuming valid state", async () => {
    const stateStore = new InMemorySaxoOAuthStateStore();
    stateStore.save("denied-state");
    const { receiver, receive } = createCodeReceiver();
    const app = buildServer({
      saxoOAuth: { configuration, stateStore, authorizationCodeReceiver: receiver },
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?error=access_denied&error_description=private-detail&state=denied-state",
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toEqual({ error: "Saxo authorization was not completed" });
      expect(response.body).not.toContain("access_denied");
      expect(response.body).not.toContain("private-detail");
      expect(response.body).not.toContain("denied-state");
      expect(receive).not.toHaveBeenCalled();
      expect(stateStore.consume("denied-state")).toBe(false);
    } finally {
      await app.close();
    }
  });

  it("returns a generic error if token exchange fails", async () => {
    const stateStore = new InMemorySaxoOAuthStateStore();
    stateStore.save("receiver-error-state");
    const fetchRequest = vi.fn(async () =>
      new Response(
        JSON.stringify({ error: "raw-saxo-error", token: "response-token" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
    );
    const tokenProvider = new SaxoSimAccessTokenProvider(
      configuration,
      fetchRequest,
    );
    const app = buildServer({
      saxoOAuth: { configuration, stateStore, authorizationCodeReceiver: tokenProvider },
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=sensitive-code&state=receiver-error-state",
      });
      const replayResponse = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=different-code&state=receiver-error-state",
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: "Unable to complete Saxo authorization" });
      expect(response.body).not.toContain("sensitive-code");
      expect(response.body).not.toContain("receiver-error-state");
      expect(response.body).not.toMatch(/raw-saxo-error|response-token|test-client-secret/);
      expect(replayResponse.statusCode).toBe(400);
      expect(fetchRequest).toHaveBeenCalledOnce();
    } finally {
      await app.close();
    }
  });

  it("contains state-store errors at the OAuth boundary", async () => {
    const stateStore: SaxoOAuthStateStore = {
      save: () => undefined,
      consume: () => {
        throw new Error("internal state detail");
      },
    };
    const { receiver, receive } = createCodeReceiver();
    const app = buildServer({
      saxoOAuth: { configuration, stateStore, authorizationCodeReceiver: receiver },
    });

    try {
      const response = await app.inject({
        method: "GET",
        url: "/auth/saxo/callback?code=sensitive-code&state=sensitive-state",
      });

      expect(response.statusCode).toBe(500);
      expect(response.json()).toEqual({ error: "Unable to complete Saxo authorization" });
      expect(response.body).not.toContain("sensitive-code");
      expect(response.body).not.toContain("sensitive-state");
      expect(response.body).not.toContain("internal state detail");
      expect(receive).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});