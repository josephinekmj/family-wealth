import { describe, expect, it } from "vitest";
import { MockInvestmentPositionGateway } from "../src/infrastructure/mock-investment-position-gateway.js";

describe("MockInvestmentPositionGateway", () => {
  it("returns one deterministic generic position by default", async () => {
    await expect(new MockInvestmentPositionGateway().listPositions()).resolves.toEqual([
      {
        id: "mock-position-1",
        instrumentName: "Example Company",
        symbol: "EXAMPLE",
        assetType: "Stock",
        amount: 10,
        currentPrice: 100,
        exposure: 1_000,
        exposureCurrency: "DKK",
      },
    ]);
  });

  it("returns defensive copies", async () => {
    const gateway = new MockInvestmentPositionGateway();
    const positions = await gateway.listPositions();
    positions[0]!.amount = 0;
    positions.splice(0, 1);

    await expect(gateway.listPositions()).resolves.toMatchObject([{ amount: 10 }]);
  });
});