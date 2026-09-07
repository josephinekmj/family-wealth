import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InvestmentBalanceDisplay } from "../src/web/InvestmentBalanceDisplay.js";
import { InvestmentConnectionLabel } from "../src/web/InvestmentConnectionLabel.js";

describe("InvestmentBalanceDisplay", () => {
  it("renders total value, cash balance, and currency without identifiers", () => {
    const markup = renderToStaticMarkup(
      createElement(InvestmentBalanceDisplay, {
        balance: { currency: "DKK", cashBalance: 45_678.9, totalValue: 123_456.78 },
      }),
    );

    expect(markup).toContain("Total value");
    expect(markup).toContain("Cash");
    expect(markup).toContain("DKK 123,456.78");
    expect(markup).toContain("DKK 45,678.90");
    expect(markup).not.toMatch(/AccountKey|ClientKey|token|provider/i);
  });
});

describe("InvestmentConnectionLabel", () => {
  it.each([
    [{ source: "mock", status: "connected" } as const, "Demo data"],
    [{ source: "saxo-sim", status: "connected" } as const, "Saxo SIM"],
    [{ source: "saxo-sim", status: "not-connected" } as const, "Saxo SIM not connected"],
  ])("renders %s as %s", (connectionStatus, expectedLabel) => {
    const markup = renderToStaticMarkup(
      createElement(InvestmentConnectionLabel, { connectionStatus }),
    );

    expect(markup).toContain(expectedLabel);
    expect(markup).not.toMatch(/token|oauth|developer|AccountKey|ClientKey/i);
  });
});