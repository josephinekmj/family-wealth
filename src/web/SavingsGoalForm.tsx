import { useState, type FormEvent } from "react";
import type { SavingsGoalRecord } from "../application/savings-goal-contracts.js";
import type { SavingsGoalUpdate } from "./client/savings-goals.js";
import { initialSavingsGoalFormValues, parseSavingsGoalForm } from "./savings-goal-form.js";

type SavingsGoalFormProps = {
  goal?: SavingsGoalRecord;
  isSaving: boolean;
  saveError: boolean;
  onSave: (goal: SavingsGoalUpdate) => void;
  onCancel: () => void;
};

export function SavingsGoalForm({
  goal,
  isSaving,
  saveError,
  onSave,
  onCancel,
}: SavingsGoalFormProps) {
  const [initialValues] = useState(() => initialSavingsGoalFormValues(goal));
  const [name, setName] = useState(initialValues.name);
  const [targetAmount, setTargetAmount] = useState(initialValues.targetAmount);
  const [currentAmount, setCurrentAmount] = useState(initialValues.currentAmount);
  const [targetDate, setTargetDate] = useState(initialValues.targetDate);
  const [expectedReturnPercent, setExpectedReturnPercent] = useState(
    initialValues.expectedReturnPercent,
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
        Target amount
        <input
          type="number"
          step="any"
          value={targetAmount}
          onChange={(event) => setTargetAmount(event.target.value)}
        />
      </label>
      <label>
        Current amount
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
      {saveError && (
        <p className="form-error">
          {goal ? "Could not save savings goal." : "Could not create savings goal."}
        </p>
      )}
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
