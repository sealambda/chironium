import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bulkReassignPractitionersToCustomers,
  fetchPersonIdsByPractitioner,
} from "@/features/customers/api/care-team-api";

const requestGraphqlMock = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api/graphql", () => ({
  requestGraphql: requestGraphqlMock,
}));

describe("fetchPersonIdsByPractitioner", () => {
  afterEach(() => {
    requestGraphqlMock.mockReset();
  });

  it("returns personIds from care teams for the given practitioner", async () => {
    requestGraphqlMock.mockResolvedValueOnce({
      listCareTeams: {
        results: [
          { subjectPatient: { personId: "person-1" } },
          { subjectPatient: { personId: "person-2" } },
          { subjectPatient: null },
        ],
      },
    });

    const result = await fetchPersonIdsByPractitioner("org-1", "prac-1");

    expect(result).toEqual(["person-1", "person-2"]);
  });

  it("returns an empty array when there are no matching care teams", async () => {
    requestGraphqlMock.mockResolvedValueOnce({
      listCareTeams: { results: [] },
    });

    const result = await fetchPersonIdsByPractitioner("org-1", "prac-1");

    expect(result).toEqual([]);
  });

  it("returns an empty array when organizationId is empty", async () => {
    const result = await fetchPersonIdsByPractitioner("", "prac-1");

    expect(requestGraphqlMock).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });
});

describe("care team bulk reassignment", () => {
  afterEach(() => {
    requestGraphqlMock.mockReset();
  });

  it("keeps the first practitioner when adding a second without replace (mirrors two sequential UI operations)", async () => {
    requestGraphqlMock
      .mockResolvedValueOnce({
        listPatients: { results: [{ id: "patient-1", personId: "person-1" }] },
      })
      .mockResolvedValueOnce({ listCareTeams: { results: [] } })
      .mockResolvedValueOnce({
        createCareTeam: { result: { id: "team-1" }, errors: null },
      })
      .mockResolvedValueOnce({
        createCareTeamParticipant: { result: { id: "part-a" }, errors: null },
      });

    await bulkReassignPractitionersToCustomers({
      organizationId: "org-1",
      personIds: ["person-1"],
      practitionerIds: ["prac-a"],
      replaceExistingAssignments: false,
    });

    requestGraphqlMock
      .mockResolvedValueOnce({
        listPatients: { results: [{ id: "patient-1", personId: "person-1" }] },
      })
      .mockResolvedValueOnce({
        listCareTeams: {
          results: [
            {
              id: "team-1",
              status: "ACTIVE",
              subjectPatientId: "patient-1",
              participants: [{ id: "part-a", practitionerId: "prac-a" }],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        createCareTeamParticipant: { result: { id: "part-b" }, errors: null },
      });

    await bulkReassignPractitionersToCustomers({
      organizationId: "org-1",
      personIds: ["person-1"],
      practitionerIds: ["prac-b"],
      replaceExistingAssignments: false,
    });

    const secondBatch = requestGraphqlMock.mock.calls.slice(4);
    expect(secondBatch).toHaveLength(3);

    const isDeleteShape = (vars: Record<string, unknown> | undefined) =>
      Boolean(vars && Object.keys(vars).length === 1 && "id" in vars);

    for (const call of secondBatch) {
      const vars = (call[0] as { variables?: Record<string, unknown> }).variables;
      expect(isDeleteShape(vars)).toBe(false);
    }
  });

  it("drops prior practitioners and keeps only the selected one when replace is enabled", async () => {
    requestGraphqlMock
      .mockResolvedValueOnce({
        listPatients: { results: [{ id: "patient-1", personId: "person-1" }] },
      })
      .mockResolvedValueOnce({
        listCareTeams: {
          results: [
            {
              id: "team-1",
              status: "ACTIVE",
              subjectPatientId: "patient-1",
              participants: [
                { id: "part-a", practitionerId: "prac-a" },
                { id: "part-b", practitionerId: "prac-b" },
              ],
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        deleteCareTeamParticipant: { result: { id: "part-a" }, errors: null },
      })
      .mockResolvedValueOnce({
        deleteCareTeamParticipant: { result: { id: "part-b" }, errors: null },
      })
      .mockResolvedValueOnce({
        createCareTeamParticipant: { result: { id: "part-new" }, errors: null },
      });

    await bulkReassignPractitionersToCustomers({
      organizationId: "org-1",
      personIds: ["person-1"],
      practitionerIds: ["prac-b"],
      replaceExistingAssignments: true,
    });

    const creates = requestGraphqlMock.mock.calls.filter((call) => {
      const vars = (call[0] as { variables?: { input?: { practitionerId?: string } } }).variables;
      return vars?.input?.practitionerId === "prac-b";
    });
    expect(creates).toHaveLength(1);
  });
});
