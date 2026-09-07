import { useEffect, useState } from "react";
import type { InvestmentAccountSummary } from "../application/investment-account-contracts.js";
import type { InvestmentBalanceSummary } from "../application/investment-balance-contracts.js";
import type { InvestmentPositionSummary } from "../application/investment-position-contracts.js";
import { InvestmentBalanceDisplay } from "./InvestmentBalanceDisplay.js";
import { InvestmentConnectionLabel } from "./InvestmentConnectionLabel.js";
import { InvestmentPositionsDisplay } from "./InvestmentPositionsDisplay.js";
import {
  fetchInvestmentAccounts,
  fetchInvestmentBalance,
  fetchInvestmentConnectionStatus,
  type InvestmentConnectionStatus,
} from "./client/investment-accounts.js";
import { fetchInvestmentPositions } from "./client/investment-positions.js";

type ViewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; accounts: InvestmentAccountSummary[] };

type BalanceState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; balance: InvestmentBalanceSummary };

type PositionsState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; positions: InvestmentPositionSummary[] };

export function InvestmentAccountsSection() {
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });
  const [balanceState, setBalanceState] = useState<BalanceState>({ status: "loading" });
  const [positionsState, setPositionsState] = useState<PositionsState>({ status: "loading" });
  const [connectionStatus, setConnectionStatus] = useState<InvestmentConnectionStatus | null>(null);

  useEffect(() => {
    let isActive = true;

    void fetchInvestmentAccounts()
      .then((accounts) => {
        if (isActive) {
          setViewState({ status: "success", accounts });
        }
      })
      .catch(() => {
        if (isActive) {
          setViewState({ status: "error" });
        }
      });

    void fetchInvestmentConnectionStatus()
      .then((status) => {
        if (isActive) {
          setConnectionStatus(status);
        }
      })
      .catch(() => {
        if (isActive) {
          setConnectionStatus(null);
        }
      });

    void fetchInvestmentBalance()
      .then((balance) => {
        if (isActive) {
          setBalanceState({ status: "success", balance });
        }
      })
      .catch(() => {
        if (isActive) {
          setBalanceState({ status: "error" });
        }
      });

    void fetchInvestmentPositions()
      .then((positions) => {
        if (isActive) {
          setPositionsState({ status: "success", positions });
        }
      })
      .catch(() => {
        if (isActive) {
          setPositionsState({ status: "error" });
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="investment-accounts" aria-labelledby="investment-accounts-heading">
      <h2 id="investment-accounts-heading">Investment accounts</h2>
      {connectionStatus && (
        <InvestmentConnectionLabel connectionStatus={connectionStatus} />
      )}
      {balanceState.status === "loading" && <p>Loading balance...</p>}
      {balanceState.status === "error" && <p>Balance unavailable</p>}
      {balanceState.status === "success" && (
        <InvestmentBalanceDisplay balance={balanceState.balance} />
      )}
      {viewState.status === "loading" && <p>Loading investment accounts...</p>}
      {viewState.status === "error" && <p>Could not load investment accounts.</p>}
      {viewState.status === "success" &&
        (viewState.accounts.length === 0 ? (
          <p>No investment accounts available.</p>
        ) : (
          <ul className="investment-account-list">
            {viewState.accounts.map((account) => (
              <li key={account.id}>
                <h3>{account.name}</h3>
                <p>Currency: {account.currency}</p>
              </li>
            ))}
          </ul>
        ))}
      {positionsState.status === "loading" && <p>Loading positions...</p>}
      {positionsState.status === "error" && <p>Positions unavailable</p>}
      {positionsState.status === "success" && (
        <InvestmentPositionsDisplay positions={positionsState.positions} />
      )}
    </section>
  );
}
