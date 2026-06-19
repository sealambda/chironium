import { beforeEach, describe, expect, it, vi } from "vitest";

const requestGraphql = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api/graphql", () => ({ requestGraphql }));
vi.mock("@/shared/api/error-utils", () => ({
  unwrapMutationResult: (result: unknown) => result,
}));

import {
  type MedicationRequestItem,
  type PrescriptionFormInput,
  SUBSTITUTION_SYSTEM,
  updatePrescription,
} from "@/features/customers/api/medication-requests-api";

/** A prescription seeded with the structured dosage/dispense the form can't edit. */
function richItem(): MedicationRequestItem {
  return {
    id: "mr_1",
    dosageInstruction: [
      {
        text: "Take one tablet by mouth once daily",
        frequency: 1,
        period: "1",
        periodUnit: "D",
        doseQuantity: { value: "1", unit: "tablet" },
        route: null,
        patientInstruction: null,
        asNeeded: null,
      },
    ],
    dispenseRequest: {
      numberOfRepeatsAllowed: 2,
      quantity: { value: "30", unit: "tablet" },
      expectedSupplyDuration: null,
      validityPeriod: null,
    },
    substitution: {
      allowedCodeableConcept: {
        coding: [{ system: SUBSTITUTION_SYSTEM, code: "N" }],
      },
      reason: { text: "Brand required" },
    },
  } as unknown as MedicationRequestItem;
}

function form(overrides: Partial<PrescriptionFormInput> = {}): PrescriptionFormInput {
  return {
    name: "Lisinopril 10 mg",
    status: "COMPLETED",
    courseOfTherapy: "",
    dosageText: "Take one tablet by mouth once daily",
    refills: "2",
    substitution: "N",
    note: "",
    ...overrides,
  };
}

/** A prescription with no structured detail yet (the create path makes these). */
function bareItem(): MedicationRequestItem {
  return { id: "mr_bare" } as unknown as MedicationRequestItem;
}

function sentInput() {
  requestGraphql.mockResolvedValue({ updateMedicationRequest: { result: { id: "mr_1" } } });
  return requestGraphql;
}

describe("updatePrescription", () => {
  beforeEach(() => {
    requestGraphql.mockClear();
  });

  it("preserves structured dosage/dispense when only the status changes", async () => {
    const mock = sentInput();

    await updatePrescription(richItem(), form({ status: "COMPLETED" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    // The unexposed structured fields survive the edit.
    expect(input.dosageInstruction[0]).toMatchObject({
      text: "Take one tablet by mouth once daily",
      frequency: 1,
      doseQuantity: { value: "1", unit: "tablet" },
    });
    expect(input.dispenseRequest).toMatchObject({
      numberOfRepeatsAllowed: 2,
      quantity: { value: "30", unit: "tablet" },
    });
  });

  it("keeps the dispense quantity when the refills field is cleared", async () => {
    const mock = sentInput();

    await updatePrescription(richItem(), form({ refills: "" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.dispenseRequest).toMatchObject({
      numberOfRepeatsAllowed: null,
      quantity: { value: "30", unit: "tablet" },
    });
  });

  it("updates the edited free text while retaining the dosage schedule", async () => {
    const mock = sentInput();

    await updatePrescription(richItem(), form({ dosageText: "Two tablets nightly" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.dosageInstruction[0]).toMatchObject({
      text: "Two tablets nightly",
      frequency: 1,
      doseQuantity: { value: "1", unit: "tablet" },
    });
  });

  it("recodes substitution while preserving its reason", async () => {
    const mock = sentInput();

    await updatePrescription(richItem(), form({ substitution: "G" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.substitution.allowedCodeableConcept.coding).toEqual([
      { system: SUBSTITUTION_SYSTEM, code: "G" },
    ]);
    expect(input.substitution.reason).toMatchObject({ text: "Brand required" });
  });

  it("clears the substitution code but keeps the reason when set to unspecified", async () => {
    const mock = sentInput();

    await updatePrescription(richItem(), form({ substitution: "" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.substitution).toMatchObject({
      allowedCodeableConcept: null,
      reason: { text: "Brand required" },
    });
  });

  it("adds a dosage instruction to a prescription that had none", async () => {
    const mock = sentInput();

    await updatePrescription(bareItem(), form({ dosageText: "1 tablet daily" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.dosageInstruction).toEqual([{ text: "1 tablet daily" }]);
  });

  it("preserves additional dosage instructions when editing the first", async () => {
    const mock = sentInput();
    const item = {
      id: "mr_multi",
      dosageInstruction: [
        { text: "morning dose", frequency: 1 },
        { text: "evening dose", frequency: 1 },
      ],
    } as unknown as MedicationRequestItem;

    await updatePrescription(item, form({ dosageText: "morning dose (updated)" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.dosageInstruction).toHaveLength(2);
    expect(input.dosageInstruction[0]).toMatchObject({
      text: "morning dose (updated)",
      frequency: 1,
    });
    expect(input.dosageInstruction[1]).toMatchObject({ text: "evening dose" });
  });

  it("drops the instruction when text is cleared and no structured data remains", async () => {
    const mock = sentInput();
    const item = {
      id: "mr_text_only",
      dosageInstruction: [{ text: "1 tablet" }],
    } as unknown as MedicationRequestItem;

    await updatePrescription(item, form({ dosageText: "" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.dosageInstruction).toEqual([]);
  });

  it("creates a dispense request when refills are set on a bare prescription", async () => {
    const mock = sentInput();

    await updatePrescription(bareItem(), form({ refills: "3" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.dispenseRequest).toEqual({ numberOfRepeatsAllowed: 3 });
  });

  it("ignores a negative refill count", async () => {
    const mock = sentInput();

    await updatePrescription(bareItem(), form({ refills: "-2" }), "org_1");

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.dispenseRequest).toBeNull();
  });

  it("passes through the edited name, status, and course of therapy", async () => {
    const mock = sentInput();

    await updatePrescription(
      bareItem(),
      form({ name: "Aspirin 100 mg", status: "ACTIVE", courseOfTherapy: "ACUTE" }),
      "org_1",
    );

    const input = mock.mock.calls[0][0].variables.input;
    expect(input.medication).toEqual({ text: "Aspirin 100 mg" });
    expect(input.status).toBe("ACTIVE");
    expect(input.courseOfTherapyType).toBe("ACUTE");
  });
});
