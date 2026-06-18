import { describe, expect, it, vi } from "vitest";

const createPatientWithPerson = vi.hoisted(() => vi.fn());

vi.mock("@/features/customers/api/patients-api", () => ({
  createPatientWithPerson,
}));

import { submitOnboarding } from "@/features/customers/api/onboarding-api";

describe("submitOnboarding", () => {
  it("creates a customer record from the onboarding draft", async () => {
    createPatientWithPerson.mockResolvedValue({
      patientId: "pat_1",
      personId: "person_1",
    });

    await submitOnboarding(
      {
        person: {
          givenName: "Rae",
          familyName: "Sun",
        },
        allergies: null,
        anthropometry: null,
        food: null,
        medications: null,
        menstrualCycle: null,
        notes: null,
        objective: null,
        pathologies: null,
        pendingNote: null,
        subscription: null,
      },
      "org_1",
      "user_1",
      "Rae Sun",
    );

    expect(createPatientWithPerson).toHaveBeenCalledTimes(1);
    expect(createPatientWithPerson).toHaveBeenCalledWith(
      {
        givenName: "Rae",
        familyName: "Sun",
      },
      "org_1",
    );
  });
});
