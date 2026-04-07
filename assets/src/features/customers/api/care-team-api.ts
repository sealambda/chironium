import { graphql } from "@/graphql";
import { unwrapMutationResult } from "@/shared/api/error-utils";
import { requestGraphql } from "@/shared/api/graphql";

// ─── Queries ─────────────────────────────────────────────────────────

const ListPatientsForPersonsQuery = graphql(`
  query ListPatientsForPersons($filter: PatientFilterInput!) {
    listPatients(first: 250, filter: $filter) {
      results {
        id
        personId
      }
    }
  }
`);

const ListCareTeamsForPatientsQuery = graphql(`
  query ListCareTeamsForPatients($filter: CareTeamFilterInput!) {
    listCareTeams(first: 250, filter: $filter) {
      results {
        id
        status
        subjectPatientId
        participants {
          id
          practitionerId
        }
      }
    }
  }
`);

// ─── Mutations ───────────────────────────────────────────────────────

const CreateCareTeamMutation = graphql(`
  mutation BulkCreateCareTeam($input: CreateCareTeamInput!) {
    createCareTeam(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const CreateCareTeamParticipantMutation = graphql(`
  mutation BulkCreateCareTeamParticipant($input: CreateCareTeamParticipantInput!) {
    createCareTeamParticipant(input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

const DeleteCareTeamParticipantMutation = graphql(`
  mutation BulkDeleteCareTeamParticipant($id: ID!) {
    deleteCareTeamParticipant(id: $id) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

// ─── Types ───────────────────────────────────────────────────────────

export interface BulkReassignPractitionersParams {
  organizationId: string;
  personIds: string[];
  practitionerIds: string[];
  replaceExistingAssignments: boolean;
}

export interface BulkReassignPractitionersResult {
  /** Person IDs from the request that have no patient record (cannot assign). */
  personsSkippedWithoutPatient: string[];
}

interface CareTeamRow {
  id: string;
  status: string | null;
  subjectPatientId: string;
  participants: Array<{ id: string; practitionerId: string }>;
}

function pickCareTeamForPatient(teams: CareTeamRow[]): CareTeamRow | undefined {
  if (teams.length === 0) {
    return undefined;
  }
  const active = teams.find((t) => t.status === "ACTIVE");
  return active ?? teams[0];
}

async function ensureCareTeam(
  organizationId: string,
  patientId: string,
  teamsForPatient: CareTeamRow[],
): Promise<string> {
  const existing = pickCareTeamForPatient(teamsForPatient);
  if (existing) {
    return existing.id;
  }

  const result = await requestGraphql({
    document: CreateCareTeamMutation,
    variables: {
      input: {
        subjectPatientId: patientId,
        status: "ACTIVE",
      },
    },
    organizationId,
  });

  const created = unwrapMutationResult(result.createCareTeam, "Failed to create care team.");
  return created.id;
}

function groupCareTeamsByPatient(careTeams: CareTeamRow[]): Map<string, CareTeamRow[]> {
  const teamsByPatient = new Map<string, CareTeamRow[]>();
  for (const team of careTeams) {
    const list = teamsByPatient.get(team.subjectPatientId) ?? [];
    list.push(team);
    teamsByPatient.set(team.subjectPatientId, list);
  }
  return teamsByPatient;
}

async function deleteParticipants(
  organizationId: string,
  participants: Array<{ id: string }>,
): Promise<void> {
  if (participants.length === 0) {
    return;
  }
  await Promise.all(
    participants.map((participant) =>
      requestGraphql({
        document: DeleteCareTeamParticipantMutation,
        variables: { id: participant.id },
        organizationId,
      }).then((r) =>
        unwrapMutationResult(r.deleteCareTeamParticipant, "Failed to remove assignment."),
      ),
    ),
  );
}

async function createNewParticipants(
  organizationId: string,
  careTeamId: string,
  practitionerIds: string[],
  replaceExistingAssignments: boolean,
  existingPractitionerIds: Set<string>,
): Promise<void> {
  await Promise.all(
    practitionerIds.map(async (practitionerId) => {
      if (!replaceExistingAssignments && existingPractitionerIds.has(practitionerId)) {
        return;
      }
      const createResult = await requestGraphql({
        document: CreateCareTeamParticipantMutation,
        variables: {
          input: {
            careTeamId,
            practitionerId,
          },
        },
        organizationId,
      });
      unwrapMutationResult(
        createResult.createCareTeamParticipant,
        "Failed to assign practitioner.",
      );
      existingPractitionerIds.add(practitionerId);
    }),
  );
}

async function reassignOnePatient(
  organizationId: string,
  patientId: string,
  teamsByPatient: Map<string, CareTeamRow[]>,
  practitionerIds: string[],
  replaceExistingAssignments: boolean,
): Promise<void> {
  const teamsHere = teamsByPatient.get(patientId) ?? [];
  const careTeamId = await ensureCareTeam(organizationId, patientId, teamsHere);

  let teamRow = teamsHere.find((t) => t.id === careTeamId);
  if (!teamRow) {
    teamRow = {
      id: careTeamId,
      status: "ACTIVE",
      subjectPatientId: patientId,
      participants: [],
    };
    teamsHere.push(teamRow);
    teamsByPatient.set(patientId, teamsHere);
  }

  const { participants } = teamRow;
  if (replaceExistingAssignments && participants.length > 0) {
    await deleteParticipants(organizationId, participants);
    teamRow.participants = [];
  }

  const existingPractitionerIds = new Set(teamRow.participants.map((x) => x.practitionerId));
  await createNewParticipants(
    organizationId,
    careTeamId,
    practitionerIds,
    replaceExistingAssignments,
    existingPractitionerIds,
  );
}

/**
 * For each selected customer (person), resolves or creates a care team, then assigns
 * practitioners. Uses FHIR CareTeam and CareTeamParticipant resources.
 */
export async function bulkReassignPractitionersToCustomers({
  organizationId,
  personIds,
  practitionerIds,
  replaceExistingAssignments,
}: BulkReassignPractitionersParams): Promise<BulkReassignPractitionersResult> {
  if (personIds.length === 0 || practitionerIds.length === 0) {
    return { personsSkippedWithoutPatient: [] };
  }

  const patientsResult = await requestGraphql({
    document: ListPatientsForPersonsQuery,
    variables: {
      filter: { personId: { in: personIds } },
    },
    organizationId,
  });

  const patients = patientsResult.listPatients?.results ?? [];
  const personToPatient = new Map<string, string>();
  for (const p of patients) {
    if (p.personId) {
      personToPatient.set(p.personId, p.id);
    }
  }

  const personsSkippedWithoutPatient = personIds.filter((id) => !personToPatient.has(id));
  const patientIds = [...new Set(personToPatient.values())];

  if (patientIds.length === 0) {
    return { personsSkippedWithoutPatient };
  }

  const careTeamsResult = await requestGraphql({
    document: ListCareTeamsForPatientsQuery,
    variables: {
      filter: { subjectPatientId: { in: patientIds } },
    },
    organizationId,
  });

  const careTeams = (careTeamsResult.listCareTeams?.results ?? []) as CareTeamRow[];
  const teamsByPatient = groupCareTeamsByPatient(careTeams);

  for (const patientId of patientIds) {
    await reassignOnePatient(
      organizationId,
      patientId,
      teamsByPatient,
      practitionerIds,
      replaceExistingAssignments,
    );
  }

  return { personsSkippedWithoutPatient };
}
