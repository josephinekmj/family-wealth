import type {
  InvestmentBalanceGateway,
  InvestmentBalanceSummary,
} from "../application/investment-balance-contracts.js";
import { SAXO_SIM_API_BASE_URL, type SaxoAccessTokenProvider } from "./index.js";

type SaxoFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

type SaxoBalanceResponse = {
  Currency?: unknown;
  CashBalance?: unknown;
  TotalValue?: unknown;
};

const SAXO_SIM_BALANCE_URL = new URL(
  "port/v1/balances/me",
  `${SAXO_SIM_API_BASE_URL}/`,
).toString();

const balanceLoadError = (): Error => new Error("Could not load Saxo investment balance");

export class SaxoInvestmentBalanceGateway implements InvestmentBalanceGateway {
  constructor(
    private readonly accessTokenProvider: SaxoAccessTokenProvider,
    private readonly fetchRequest: SaxoFetch = globalThis.fetch,
  ) {}

  async getBalance(): Promise<InvestmentBalanceSummary> {
    try {
      const accessToken = await this.accessTokenProvider.getAccessToken();
      const response = await this.fetchRequest(SAXO_SIM_BALANCE_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken.value}` },
      });

      if (!response.ok) {
        throw balanceLoadError();
      }

      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null) {
        throw balanceLoadError();
      }

      const { Currency: currency, CashBalance: cashBalance, TotalValue: totalValue } =
        payload as SaxoBalanceResponse;

      if (
        typeof currency !== "string" ||
        !currency.trim() ||
        typeof cashBalance !== "number" ||
        !Number.isFinite(cashBalance) ||
        typeof totalValue !== "number" ||
        !Number.isFinite(totalValue)
      ) {
        throw balanceLoadError();
      }

      return { currency: currency.trim(), cashBalance, totalValue };
    } catch {
      throw balanceLoadError();
    }
  }
}