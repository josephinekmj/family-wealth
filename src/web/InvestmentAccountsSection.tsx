import { useEffect, useState } from "react";
import type { InvestmentAccountSummary } from "../application/investment-account-contracts.js";
import { fetchInvestmentAccounts } from "./client/investment-accounts.js";

type ViewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; accounts: InvestmentAccountSummary[] };

export function InvestmentAccountsSection() {
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });

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

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <section className="investment-accounts" aria-labelledby="investment-accounts-heading">
      <h2 id="investment-accounts-heading">Investment accounts</h2>
      <p className="demo-label">Demo data</p>
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
    </section>
  );
}
