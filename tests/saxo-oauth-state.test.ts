import { describe, expect, it } from "vitest";
import {
  InMemorySaxoAuthorizationCodeReceiver,
  InMemorySaxoOAuthStateStore,
} from "../src/saxo/index.js";

describe("InMemorySaxoOAuthStateStore", () => {
  it("consumes a saved state exactly once", () => {
    const store = new InMemorySaxoOAuthStateStore();
    store.save("state-one");

    expect(store.consume("state-one")).toBe(true);
    expect(store.consume("state-one")).toBe(false);
  });

  it("rejects an unknown state", () => {
    expect(new InMemorySaxoOAuthStateStore().consume("unknown-state")).toBe(false);
  });

  it("rejects and removes an expired state using the injected clock", () => {
    let now = 1_000;
    const store = new InMemorySaxoOAuthStateStore(10 * 60 * 1000, () => now);
    store.save("expired-state");

    now += 10 * 60 * 1000;

    expect(store.consume("expired-state")).toBe(false);
    expect(store.consume("expired-state")).toBe(false);
  });

  it("tracks separate states independently", () => {
    const store = new InMemorySaxoOAuthStateStore();
    store.save("state-one");
    store.save("state-two");

    expect(store.consume("state-one")).toBe(true);
    expect(store.consume("state-two")).toBe(true);
  });
});

describe("InMemorySaxoAuthorizationCodeReceiver", () => {
  it("captures an authorization code in memory for one-time retrieval", async () => {
    const receiver = new InMemorySaxoAuthorizationCodeReceiver();

    await receiver.receive("test-authorization-code");

    expect(receiver.take()).toBe("test-authorization-code");
    expect(receiver.take()).toBeUndefined();
  });
});