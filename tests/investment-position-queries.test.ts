import { describe, expect, it, vi } from "vitest";
import {
  createInvestmentPositionQueries,
  type InvestmentPositionGateway,
  type InvestmentPositionSummary,
} from "../src/application/index.js";

describe("investment position queries", () => {
  it("delegates to the gateway and returns its results", async () => {
    const positions: InvestmentPositionSummary[] = [
      {
        id: "position-1",
        assetType: "Stock",
        amount: 10,
        currentPrice: 100,
        exposure: 1_000,
        exposureCurrency: "DKK",
      },
    ];
    const listPositions = vi.fn(async () => positions);
    const gateway: InvestmentPositionGateway = { listPositions };

    await expect(createInvestmentPositionQueries(gateway).listInvestmentPositions()).resolves.toBe(
      positions,
    );
    expect(listPositions).toHaveBeenCalledExactlyOnceWith();
  });

  it("propagates gateway failures", async () => {
    const error = new Error("Position lookup failed");
    const gateway: InvestmentPositionGateway = {
      listPositions: async () => {
        throw error;
      },
    };

    await expect(createInvestmentPositionQueries(gateway).listInvestmentPositions()).rejects.toBe(
      error,
    );
  });
});