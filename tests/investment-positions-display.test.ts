import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InvestmentPositionsDisplay } from "../src/web/InvestmentPositionsDisplay.js";

describe("InvestmentPositionsDisplay", () => {
  it("renders only asset type and formatted numeric position values", () => {
    const markup = renderToStaticMarkup(
      createElement(InvestmentPositionsDisplay, {
        positions: [
          {
            id: "opaque-position-id",
            assetType: "Stock",
            amount: -2.5,
            currentPrice: 123.45,
            exposure: -308.625,
            exposureCurrency: "DKK",
          },
        ],
      }),
    );

    expect(markup).toContain("Positions");
    expect(markup).toContain("Stock");
    expect(markup).toContain("-2.5");
    expect(markup).toContain("DKK 123.45");
    expect(markup).toContain("-DKK 308.63");
    expect(markup).not.toMatch(/opaque-position-id|PositionId|NetPositionId|Uic|AccountKey|ClientKey/);
  });

  it("renders the successful empty state", () => {
    const markup = renderToStaticMarkup(
      createElement(InvestmentPositionsDisplay, { positions: [] }),
    );

    expect(markup).toContain("No investment positions");
  });
});