import { beforeEach, describe, expect, it, vi } from "vitest";

const requestGraphql = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api/graphql", () => ({ requestGraphql }));
vi.mock("@/shared/api/error-utils", () => ({
  unwrapMutationResult: (result: unknown) => result,
}));

import {
  createPrescription,
  type PrescriptionFormInput,
  type PrescriptionUpdateSource,
  SUBSTITUTION_SYSTEM,
  updatePrescription,
} from "@/features/customers/api/medication-requests-api";

/** A prescription seeded with the structured dosage/dispense the form can't edit. */
function richItem(): PrescriptionUpdateSource {
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
  } satisfies PrescriptionUpdateSource;
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

type DosageInstructionRow = NonNullable<PrescriptionUpdateSource["dosageInstruction"]>[number];

function dosageRow(
  text: string,
  overrides: Partial<DosageInstructionRow> = {},
): DosageInstructionRow {
  return {
    text,
    patientInstruction: null,
    asNeeded: null,
    frequency: null,
    period: null,
    periodUnit: null,
    route: null,
    doseQuantity: null,
    ...overrides,
  } satisfies DosageInstructionRow;
}

/** A prescription with no structured detail yet (the create path makes these). */
function bareItem(): PrescriptionUpdateSource {
  return { id: "mr_bare" } satisfies PrescriptionUpdateSource;
}

function sentInput() {
  requestGraphql.mockResolvedValue({ updateMedicationRequest: { result: { id: "mr_1" } } });
  return requestGraphql;
}

function sentCreateInput() {
  requestGraphql.mockResolvedValue({ createMedicationRequest: { result: { id: "mr_new" } } });
  return requestGraphql;
}

interface SubstitutionMutationInput {
  allowedCodeableConcept?: {
    coding?: { system?: string; code?: string }[];
    text?: string;
  } | null;
  reason?: { text?: string };
}

interface PrescriptionMutationInput {
  medication?: { text?: string };
  status?: string;
  courseOfTherapyType?: string | null;
  dosageInstruction?: Record<string, unknown>[];
  dispenseRequest?: Record<string, unknown> | null;
  substitution?: SubstitutionMutationInput | null;
  note?: { text?: string }[];
  intent?: string;
  subjectId?: string;
}

function getMutationInput(mock: ReturnType<typeof vi.fn>): PrescriptionMutationInput {
  const request = mock.mock.calls[0]?.[0];
  if (request === undefined || typeof request !== "object" || request === null) {
    throw new Error("Expected requestGraphql to receive a mutation request.");
  }
  const { variables } = request satisfies { variables: { input: PrescriptionMutationInput } };
  return variables.input;
}

describe("createPrescription", () => {
  beforeEach(() => {
    requestGraphql.mockClear();
  });

  it("sends the full form payload on create", async () => {
    const mock = sentCreateInput();

    await createPrescription(
      form({
        name: "Vitamin D",
        dosageText: "1 capsule daily",
        refills: "1",
        substitution: "G",
        note: "Take with food",
        courseOfTherapy: "CONTINUOUS",
      }),
      "patient_1",
      "org_1",
    );

    expect(mock).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: {
          input: {
            medication: { text: "Vitamin D" },
            status: "COMPLETED",
            courseOfTherapyType: "CONTINUOUS",
            dosageInstruction: [{ text: "1 capsule daily" }],
            dispenseRequest: { numberOfRepeatsAllowed: 1 },
            substitution: {
              allowedCodeableConcept: {
                coding: [{ system: SUBSTITUTION_SYSTEM, code: "G" }],
              },
            },
            note: [{ text: "Take with food" }],
            intent: "ORDER",
            subjectId: "patient_1",
          },
        },
        organizationId: "org_1",
      }),
    );
  });
});

describe("updatePrescription", () => {
  beforeEach(() => {
    requestGraphql.mockClear();
  });

  it("preserves structured dosage/dispense when only the status changes", async () => {
    const mock = sentInput();

    await updatePrescription(richItem(), form({ status: "COMPLETED" }), "org_1");

    const input = getMutationInput(mock);
    // The unexposed structured fields survive the edit.
    expect(input.dosageInstruction?.[0]).toMatchObject({
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

    const input = getMutationInput(mock);
    expect(input.dispenseRequest).toMatchObject({
      numberOfRepeatsAllowed: null,
      quantity: { value: "30", unit: "tablet" },
    });
  });

  it("updates the edited free text while retaining the dosage schedule", async () => {
    const mock = sentInput();

    await updatePrescription(richItem(), form({ dosageText: "Two tablets nightly" }), "org_1");

    const input = getMutationInput(mock);
    expect(input.dosageInstruction?.[0]).toMatchObject({
      text: "Two tablets nightly",
      frequency: 1,
      doseQuantity: { value: "1", unit: "tablet" },
    });
  });

  it("recodes substitution while preserving its reason", async () => {
    const mock = sentInput();

    await updatePrescription(richItem(), form({ substitution: "G" }), "org_1");

    const input = getMutationInput(mock);
    expect(input.substitution?.allowedCodeableConcept?.coding).toEqual([
      { system: SUBSTITUTION_SYSTEM, code: "G" },
    ]);
    expect(input.substitution?.reason).toMatchObject({ text: "Brand required" });
  });

  it("clears the substitution code but keeps the reason when set to unspecified", async () => {
    const mock = sentInput();

    await updatePrescription(richItem(), form({ substitution: "" }), "org_1");

    const input = getMutationInput(mock);
    expect(input.substitution).toMatchObject({
      allowedCodeableConcept: null,
      reason: { text: "Brand required" },
    });
  });

  it("adds a dosage instruction to a prescription that had none", async () => {
    const mock = sentInput();

    await updatePrescription(bareItem(), form({ dosageText: "1 tablet daily" }), "org_1");

    const input = getMutationInput(mock);
    expect(input.dosageInstruction).toEqual([{ text: "1 tablet daily" }]);
  });

  it("preserves additional dosage instructions when editing the first", async () => {
    const mock = sentInput();
    const item = {
      id: "mr_multi",
      dosageInstruction: [
        dosageRow("morning dose", { frequency: 1 }),
        dosageRow("evening dose", { frequency: 1 }),
      ],
    } satisfies PrescriptionUpdateSource;

    await updatePrescription(item, form({ dosageText: "morning dose (updated)" }), "org_1");

    const input = getMutationInput(mock);
    expect(input.dosageInstruction).toHaveLength(2);
    expect(input.dosageInstruction?.[0]).toMatchObject({
      text: "morning dose (updated)",
      frequency: 1,
    });
    expect(input.dosageInstruction?.[1]).toMatchObject({ text: "evening dose" });
  });

  it("drops the instruction when text is cleared and no structured data remains", async () => {
    const mock = sentInput();
    const item = {
      id: "mr_text_only",
      dosageInstruction: [dosageRow("1 tablet")],
    } satisfies PrescriptionUpdateSource;

    await updatePrescription(item, form({ dosageText: "" }), "org_1");

    const input = getMutationInput(mock);
    expect(input.dosageInstruction).toEqual([]);
  });

  it("creates a dispense request when refills are set on a bare prescription", async () => {
    const mock = sentInput();

    await updatePrescription(bareItem(), form({ refills: "3" }), "org_1");

    const input = getMutationInput(mock);
    expect(input.dispenseRequest).toEqual({ numberOfRepeatsAllowed: 3 });
  });

  it("ignores a negative refill count", async () => {
    const mock = sentInput();

    await updatePrescription(bareItem(), form({ refills: "-2" }), "org_1");

    const input = getMutationInput(mock);
    expect(input.dispenseRequest).toBeNull();
  });

  it("passes through the edited name, status, and course of therapy", async () => {
    const mock = sentInput();

    await updatePrescription(
      bareItem(),
      form({ name: "Aspirin 100 mg", status: "ACTIVE", courseOfTherapy: "ACUTE" }),
      "org_1",
    );

    const input = getMutationInput(mock);
    expect(input.medication).toEqual({ text: "Aspirin 100 mg" });
    expect(input.status).toBe("ACTIVE");
    expect(input.courseOfTherapyType).toBe("ACUTE");
  });
});
