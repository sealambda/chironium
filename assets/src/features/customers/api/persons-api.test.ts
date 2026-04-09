import { describe, expect, it } from "vitest";

import { mergePersonsWithSubscriptions, type Person } from "@/features/customers/api/persons-api";

describe("mergePersonsWithSubscriptions", () => {
  it("includes every person the practitioner-scoped list query returns", () => {
    const person = {
      id: "person_new",
      name: [{ given: ["Rae"], family: "Sun" }],
      telecom: [],
      birthDate: null,
      gender: null,
    } as Person;

    const rows = mergePersonsWithSubscriptions([person], []);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.person.id).toBe("person_new");
  });
});
