import { useState, type FormEvent } from "react";
import type { SavingsGoalRecord } from "../application/savings-goal-contracts.js";
import type { SavingsGoalUpdate } from "./client/savings-goals.js";
import { parseSavingsGoalForm, toDateInputValue, toPercentValue } from "./savings-goal-form.js";

type SavingsGoalEditFormProps = {
  goal: SavingsGoalRecord;
  isSaving: boolean;
  saveError: boolean;
  onSave: (goal: SavingsGoalUpdate) => void;
  onCancel: () => void;
};

export function SavingsGoalEditForm({
  goal,
  isSaving,
  saveError,
  onSave,
  onCancel,
}: SavingsGoalEditFormProps) {
  const [name, setName] = useState(goal.name);
  const [targetAmount, setTargetAmount] = useState(String(goal.targetAmount));
  const [currentAmount, setCurrentAmount] = useState(String(goal.currentAmount));
  const [targetDate, setTargetDate] = useState(toDateInputValue(goal.targetDate));
  const [expectedReturnPercent, setExpectedReturnPercent] = useState(
    String(toPercentValue(goal.expectedAnnualReturn)),
  );
  const [validationError, setValidationError] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const update = parseSavingsGoalForm({
      name,
      targetAmount,
      currentAmount,
      targetDate,
      expectedReturnPercent,
    });

    if (update === null) {
      setValidationError(true);
      return;
    }

    setValidationError(false);
    onSave(update);
  };

  return (
    <form className="goal-form" onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Target
        <input
          type="number"
          step="any"
          value={targetAmount}
          onChange={(event) => setTargetAmount(event.target.value)}
        />
      </label>
      <label>
        Saved
        <input
          type="number"
          step="any"
          value={currentAmount}
          onChange={(event) => setCurrentAmount(event.target.value)}
        />
      </label>
      <label>
        Target date
        <input
          type="date"
          value={targetDate}
          onChange={(event) => setTargetDate(event.target.value)}
        />
      </label>
      <label>
        Expected return (%)
        <input
          type="number"
          step="any"
          value={expectedReturnPercent}
          onChange={(event) => setExpectedReturnPercent(event.target.value)}
        />
      </label>
      {validationError && <p className="form-error">Enter valid values.</p>}
      {saveError && <p className="form-error">Could not save savings goal.</p>}
      <div className="form-actions">
        <button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        <button type="button" className="secondary" disabled={isSaving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
