import { graphql } from "@/graphql";

type CodeTypes =
  | "clinicalNote"
  | "dietInclusion"
  | "dietExclusion"
  | "menstrualCycle"
  | "bodyWeight"
  | "bodyHeight";

export const CODES: Record<CodeTypes, string> = {
  clinicalNote: "clinical-note",
  dietInclusion: "diet-inclusion",
  dietExclusion: "diet-exclusion",
  menstrualCycle: "364307006",
  bodyWeight: "29463-7",
  bodyHeight: "8302-2",
};

export const CreateObservationMutation = graphql(`
  mutation CreateObservation($input: CreateObservationInput!) {
    createObservation(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

export const LogMenstrualPeriodStartMutation = graphql(`
  mutation LogMenstrualPeriodStart($input: LogMenstrualPeriodStartInput!) {
    logMenstrualPeriodStart(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

export const LogMenstrualPeriodDurationMutation = graphql(`
  mutation LogMenstrualPeriodDuration($input: LogMenstrualPeriodDurationInput!) {
    logMenstrualPeriodDuration(input: $input) {
      result {
        id
        status
      }
      errors {
        message
      }
    }
  }
`);

export const UpdateObservationMutation = graphql(`
  mutation UpdateObservation($id: ID!, $input: UpdateObservationInput) {
    updateObservation(id: $id, input: $input) {
      result {
        id
        valueString
        note {
          text
          time
          authorReference
          authorString
        }
      }
      errors {
        message
      }
    }
  }
`);

export const DeleteObservationMutation = graphql(`
  mutation DeleteObservation($id: ID!) {
    deleteObservation(id: $id) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);
