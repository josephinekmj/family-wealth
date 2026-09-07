import { describe, expect, it, vi } from "vitest";
import {
  createInvestmentAccountQueries,
  type InvestmentAccountGateway,
  type InvestmentAccountSummary,
} from "../src/application/index.js";

describe("investment account queries", () => {
  it("delegates to the gateway interface and returns its results", async () => {
    const accounts: InvestmentAccountSummary[] = [
      { id: "mock-account-1", name: "Investment account", currency: "DKK" },
    ];
    const listAccounts = vi.fn(async () => accounts);
    const gateway: InvestmentAccountGateway = { listAccounts };
    const queries = createInvestmentAccountQueries(gateway);

    expect(await queries.listInvestmentAccounts()).toEqual(accounts);
    expect(listAccounts).toHaveBeenCalledExactlyOnceWith();
  });

  it("returns an empty gateway result", async () => {
    const gateway: InvestmentAccountGateway = { listAccounts: async () => [] };

    expect(await createInvestmentAccountQueries(gateway).listInvestmentAccounts()).toEqual([]);
  });

  it("propagates gateway failures", async () => {
    const error = new Error("Account lookup failed");
    const gateway: InvestmentAccountGateway = {
      listAccounts: async () => {
        throw error;
      },
    };

    await expect(createInvestmentAccountQueries(gateway).listInvestmentAccounts()).rejects.toBe(
      error,
    );
  });
});
