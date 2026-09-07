import type { InvestmentBalanceSummary } from "../application/investment-balance-contracts.js";

type InvestmentBalanceDisplayProps = {
  balance: InvestmentBalanceSummary;
};

const formatCurrency = (value: number, currency: string): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    currencyDisplay: "code",
  }).format(value);

export function InvestmentBalanceDisplay({ balance }: InvestmentBalanceDisplayProps) {
  return (
    <dl className="investment-balance" aria-label="Investment portfolio balance">
      <div>
        <dt>Total value</dt>
        <dd>{formatCurrency(balance.totalValue, balance.currency)}</dd>
      </div>
      <div>
        <dt>Cash</dt>
        <dd>{formatCurrency(balance.cashBalance, balance.currency)}</dd>
      </div>
    </dl>
  );
}