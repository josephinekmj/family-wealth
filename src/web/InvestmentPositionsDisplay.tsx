import type { InvestmentPositionSummary } from "../application/investment-position-contracts.js";

type InvestmentPositionsDisplayProps = {
  positions: InvestmentPositionSummary[];
};

const amountFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 8,
});

const formatCurrency = (value: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(value);

export function InvestmentPositionsDisplay({ positions }: InvestmentPositionsDisplayProps) {
  return (
    <section className="investment-positions" aria-labelledby="investment-positions-heading">
      <h3 id="investment-positions-heading">Positions</h3>
      {positions.length === 0 ? (
        <p>No investment positions</p>
      ) : (
        <ul className="investment-position-list">
          {positions.map((position) => (
            <li key={position.id}>
              {position.instrumentName && position.symbol ? (
                <>
                  <h4>{position.instrumentName}</h4>
                  <p className="position-instrument-type">
                    {position.symbol} · {position.assetType}
                  </p>
                </>
              ) : (
                <h4>{position.assetType}</h4>
              )}
              <dl>
                <div>
                  <dt>Amount</dt>
                  <dd>{amountFormatter.format(position.amount)}</dd>
                </div>
                <div>
                  <dt>Current price</dt>
                  <dd>{formatCurrency(position.currentPrice, position.exposureCurrency)}</dd>
                </div>
                <div>
                  <dt>Exposure</dt>
                  <dd>{formatCurrency(position.exposure, position.exposureCurrency)}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}