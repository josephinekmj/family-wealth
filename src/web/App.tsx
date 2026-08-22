import { useEffect, useState } from "react";
import type { SavingsGoalRecord } from "../application/savings-goal-contracts.js";
import { SavingsGoalEditForm } from "./SavingsGoalEditForm.js";
import {
  fetchSavingsGoals,
  updateSavingsGoal,
  type SavingsGoalUpdate,
} from "./client/savings-goals.js";
import {
  getCombinedSavingsProjection,
  getSavingsGoalProjection,
} from "./savings-goal-projection.js";

type ViewState =
  { status: "loading" } | { status: "error" } | { status: "success"; goals: SavingsGoalRecord[] };

export default function App() {
  const [viewState, setViewState] = useState<ViewState>({ status: "loading" });
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);

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

  const startEditing = (id: string) => {
    setEditingGoalId(id);
    setSaveError(false);
  };

  const cancelEditing = () => {
    setEditingGoalId(null);
    setSaveError(false);
  };

  const saveGoal = async (id: string, update: SavingsGoalUpdate) => {
    setIsSaving(true);
    setSaveError(false);

    try {
      await updateSavingsGoal(id, update);
      const goals = await fetchSavingsGoals();
      setViewState({ status: "success", goals });
      setEditingGoalId(null);
    } catch {
      setSaveError(true);
    } finally {
      setIsSaving(false);
    }
  };

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

    const asOfDate = new Date();
    const combinedProjection = getCombinedSavingsProjection(viewState.goals, asOfDate);

    return (
      <>
        <section className="combined-summary" aria-label="Combined savings projection">
          <h2>Combined monthly saving</h2>
          {combinedProjection.status === "available" ? (
            <p className="combined-value">
              {formatCurrency(combinedProjection.requiredMonthlyContribution)}
            </p>
          ) : (
            <p className="combined-unavailable">Combined monthly saving unavailable.</p>
          )}
          <p className="combined-explanation">Required across all savings goals</p>
        </section>
        <div className="goals-list" aria-label="Savings goals">
          {viewState.goals.map((goal) => {
            const projection = getSavingsGoalProjection(goal, asOfDate);

            return (
              <article key={goal.id} className="goal-card">
                {editingGoalId === goal.id ? (
                  <SavingsGoalEditForm
                    goal={goal}
                    isSaving={isSaving}
                    saveError={saveError}
                    onSave={(update) => void saveGoal(goal.id, update)}
                    onCancel={cancelEditing}
                  />
                ) : (
                  <>
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
                      {projection.status === "available" && (
                        <>
                          <div className="primary-projection">
                            <dt>Required monthly saving</dt>
                            <dd>
                              {formatCurrency(projection.projection.requiredMonthlyContribution)}
                            </dd>
                          </div>
                          <div>
                            <dt>Months remaining</dt>
                            <dd>{projection.projection.monthsRemaining}</dd>
                          </div>
                          <div>
                            <dt>Projected value</dt>
                            <dd>{formatCurrency(projection.projection.projectedValue)}</dd>
                          </div>
                        </>
                      )}
                    </dl>
                    {projection.status === "unavailable" && (
                      <p className="projection-unavailable">Projection unavailable.</p>
                    )}
                    <button type="button" onClick={() => startEditing(goal.id)}>
                      Edit
                    </button>
                  </>
                )}
              </article>
            );
          })}
        </div>
      </>
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
  maximumFractionDigits: 2,
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
