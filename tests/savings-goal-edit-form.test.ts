import { describe, expect, it } from "vitest";
import {
  initialSavingsGoalFormValues,
  parseSavingsGoalForm,
  toDateInputValue,
  toPercentValue,
} from "../src/web/savings-goal-form.js";

const validForm = {
  name: "Confirmation",
  targetAmount: "40000",
  currentAmount: "5000",
  targetDate: "2033-05-01",
  expectedReturnPercent: "4",
};

describe("savings goal form transformations", () => {
  it("converts API dates and decimal returns to browser values", () => {
    expect(toDateInputValue("2033-05-01T00:00:00.000Z")).toBe("2033-05-01");
    expect(toPercentValue(0.04)).toBe(4);
  });

  it("parses browser strings into the API update contract", () => {
    expect(parseSavingsGoalForm(validForm)).toEqual({
      name: "Confirmation",
      targetAmount: 40000,
      currentAmount: 5000,
      targetDate: "2033-05-01T00:00:00.000Z",
      expectedAnnualReturn: 0.04,
    });
  });

  it.each([
    { ...validForm, name: "   " },
    { ...validForm, targetAmount: "0" },
    { ...validForm, targetAmount: "not-a-number" },
    { ...validForm, currentAmount: "-1" },
    { ...validForm, targetDate: "" },
    { ...validForm, expectedReturnPercent: "-100" },
  ])("rejects invalid form values", (form) => {
    expect(parseSavingsGoalForm(form)).toBeNull();
  });
});

describe("new savings goal form values", () => {
  it("starts blank with zero saved and no assumed return, and cannot produce a payload", () => {
    const values = initialSavingsGoalFormValues();

    expect(values).toEqual({
      name: "",
      targetAmount: "",
      currentAmount: "0",
      targetDate: "",
      expectedReturnPercent: "",
    });
    expect(parseSavingsGoalForm(values)).toBeNull();
  });

  it("accepts zero saved and reuses percentage and UTC date conversion", () => {
    expect(
      parseSavingsGoalForm({
        ...initialSavingsGoalFormValues(),
        name: "New savings goal",
        targetAmount: "12000",
        targetDate: "2034-06-01",
        expectedReturnPercent: "4",
      }),
    ).toEqual({
      name: "New savings goal",
      targetAmount: 12000,
      currentAmount: 0,
      targetDate: "2034-06-01T00:00:00.000Z",
      expectedAnnualReturn: 0.04,
    });
  });

  it.each([
    { ...validForm, expectedReturnPercent: "" },
    { ...validForm, targetAmount: "" },
    { ...validForm, currentAmount: "" },
    { ...validForm, targetAmount: "Infinity" },
    { ...validForm, currentAmount: "NaN" },
    { ...validForm, expectedReturnPercent: "Infinity" },
  ])("does not produce a payload for missing or non-finite numbers", (values) => {
    expect(parseSavingsGoalForm(values)).toBeNull();
  });
});
