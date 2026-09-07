import { createHash } from "node:crypto";
import type {
  InvestmentAccountGateway,
  InvestmentAccountSummary,
} from "../application/investment-account-contracts.js";
import { SAXO_SIM_API_BASE_URL, type SaxoAccessTokenProvider } from "./index.js";

type SaxoFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;

type SaxoAccountResponse = {
  AccountKey?: unknown;
  AccountId?: unknown;
  DisplayName?: unknown;
  Currency?: unknown;
};

type SaxoAccountsResponse = {
  Data?: unknown;
};

const SAXO_SIM_ACCOUNTS_URL = new URL(
  "port/v1/accounts/me",
  `${SAXO_SIM_API_BASE_URL}/`,
).toString();

const accountLoadError = (): Error => new Error("Could not load Saxo investment accounts");

const nonblankString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;

const mapSaxoAccount = (value: unknown): InvestmentAccountSummary => {
  if (typeof value !== "object" || value === null) {
    throw accountLoadError();
  }

  const account = value as SaxoAccountResponse;
  const accountKey = nonblankString(account.AccountKey);
  const accountId = nonblankString(account.AccountId);
  const displayName = nonblankString(account.DisplayName);
  const currency = nonblankString(account.Currency);

  if (!accountKey || !accountId || !currency) {
    throw accountLoadError();
  }

  return {
    id: `saxo-${createHash("sha256").update(accountKey).digest("hex")}`,
    name: displayName ?? accountId ?? "Investment account",
    currency,
  };
};

export class SaxoInvestmentAccountGateway implements InvestmentAccountGateway {
  constructor(
    private readonly accessTokenProvider: SaxoAccessTokenProvider,
    private readonly fetchRequest: SaxoFetch = globalThis.fetch,
  ) {}

  async listAccounts(): Promise<InvestmentAccountSummary[]> {
    try {
      const accessToken = await this.accessTokenProvider.getAccessToken();
      const response = await this.fetchRequest(SAXO_SIM_ACCOUNTS_URL, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken.value}` },
      });

      if (!response.ok) {
        throw accountLoadError();
      }

      const payload: unknown = await response.json();
      if (typeof payload !== "object" || payload === null) {
        throw accountLoadError();
      }

      const { Data: accounts } = payload as SaxoAccountsResponse;
      if (!Array.isArray(accounts)) {
        throw accountLoadError();
      }

      return accounts.map(mapSaxoAccount);
    } catch {
      throw accountLoadError();
    }
  }
}