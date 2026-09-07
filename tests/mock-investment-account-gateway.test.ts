import { describe, expect, it } from "vitest";
import type { InvestmentAccountSummary } from "../src/application/investment-account-contracts.js";
import { MockInvestmentAccountGateway } from "../src/infrastructure/mock-investment-account-gateway.js";

const account: InvestmentAccountSummary = {
  id: "mock-account-1",
  name: "Investment account",
  currency: "DKK",
};

describe("MockInvestmentAccountGateway", () => {
  it("returns seeded accounts", async () => {
    const seed = [account, { id: "mock-account-2", name: "Second account", currency: "EUR" }];
    const gateway = new MockInvestmentAccountGateway(seed);

    expect(await gateway.listAccounts()).toEqual(seed);
  });

  it("returns an empty array for an empty seed", async () => {
    expect(await new MockInvestmentAccountGateway([]).listAccounts()).toEqual([]);
  });

  it("starts empty when no seed is supplied", async () => {
    expect(await new MockInvestmentAccountGateway().listAccounts()).toEqual([]);
  });

  it("isolates internal state from returned array mutations", async () => {
    const gateway = new MockInvestmentAccountGateway([account]);
    const accounts = await gateway.listAccounts();

    accounts.splice(0, 1);

    expect(await gateway.listAccounts()).toEqual([account]);
  });

  it("isolates internal state from returned account mutations", async () => {
    const gateway = new MockInvestmentAccountGateway([account]);
    const accounts = await gateway.listAccounts();

    accounts[0]!.name = "Changed account";
    accounts[0]!.currency = "EUR";

    expect(await gateway.listAccounts()).toEqual([account]);
  });

  it("isolates internal state from constructor seed mutations", async () => {
    const seed = [{ ...account }];
    const gateway = new MockInvestmentAccountGateway(seed);

    seed[0]!.name = "Changed seed";
    seed.push({ id: "mock-account-2", name: "Added seed", currency: "EUR" });

    expect(await gateway.listAccounts()).toEqual([account]);
  });
});
