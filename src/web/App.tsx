import { useEffect, useState } from "react";
import type { SavingsGoalRecord } from "../application/savings-goal-contracts.js";
import { fetchSavingsGoals } from "./client/savings-goals";

type ViewState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; goals: SavingsGoalRecord[] };

export default function App() {
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });

  useEffect(() => {
    let isActive = true;

    void fetchSavingsGoals()
      .then((goals) => {
        if (!isActive) {
          return;
        }

        setViewState({ status: "success", goals });
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        setViewState({ status: "error" });
      });

    return () => {
      isActive = false;
    };
  }, []);

  const renderContent = () => {
    if (viewState.status === "loading") {
      return <p>Loading savings goals...</p>;
    }

    if (viewState.status === "error") {
      return <p>Could not load savings goals.</p>;
    }

    if (viewState.goals.length === 0) {
      return <p>No savings goals yet.</p>;
    }

    return (
      <div className="goals-list" aria-label="Savings goals">
        {viewState.goals.map((goal) => (
          <article key={goal.id} className="goal-card">
            <h2>{goal.name}</h2>
            <dl>
              <div>
                <dt>Target</dt>
                <dd>{formatCurrency(goal.targetAmount)}</dd>
              </div>
              <div>
                <dt>Saved</dt>
                <dd>{formatCurrency(goal.currentAmount)}</dd>
              </div>
              <div>
                <dt>Target date</dt>
                <dd>{formatDate(goal.targetDate)}</dd>
              </div>
              <div>
                <dt>Expected return</dt>
                <dd>{formatPercent(goal.expectedAnnualReturn)}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    );
  };

  return (
    <main className="app-shell">
      <section className="panel">
        <h1>Family Wealth</h1>
        {renderContent()}
      </section>
    </main>
  );
}

const currencyFormatter = new Intl.NumberFormat("da-DK", {
  style: "currency",
  currency: "DKK",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("da-DK", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const percentFormatter = new Intl.NumberFormat("da-DK", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  return currencyFormatter.format(value);
}

function formatDate(isoDate: string): string {
  return dateFormatter.format(new Date(isoDate));
}

function formatPercent(value: number): string {
  return percentFormatter.format(value);
}