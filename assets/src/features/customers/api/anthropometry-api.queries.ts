import { graphql } from "@/graphql";

// ─── Mutations ───────────────────────────────────────────────────────

export const LogBodyHeightMutation = graphql(`
  mutation LogBodyHeight($input: LogBodyHeightInput!) {
    logBodyHeight(input: $input) {
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

export const LogBodyWeightMutation = graphql(`
  mutation LogBodyWeight($input: LogBodyWeightInput!) {
    logBodyWeight(input: $input) {
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

export const LogChestCircumferenceMutation = graphql(`
  mutation LogChestCircumference($input: LogChestCircumferenceInput!) {
    logChestCircumference(input: $input) {
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

export const LogWaistCircumferenceMutation = graphql(`
  mutation LogWaistCircumference($input: LogWaistCircumferenceInput!) {
    logWaistCircumference(input: $input) {
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

export const LogHipCircumferenceMutation = graphql(`
  mutation LogHipCircumference($input: LogHipCircumferenceInput!) {
    logHipCircumference(input: $input) {
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

export const LogArmCircumferenceMutation = graphql(`
  mutation LogArmCircumference($input: LogArmCircumferenceInput!) {
    logArmCircumference(input: $input) {
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

export const LogThighCircumferenceMutation = graphql(`
  mutation LogThighCircumference($input: LogThighCircumferenceInput!) {
    logThighCircumference(input: $input) {
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

export const UpdateAnthropometryObservationMutation = graphql(`
  mutation UpdateAnthropometryObservation($id: ID!, $input: UpdateObservationInput) {
    updateObservation(id: $id, input: $input) {
      result {
        id
      }
      errors {
        message
      }
    }
  }
`);

export const DeleteAnthropometryObservationMutation = graphql(`
  mutation DeleteAnthropometryObservation($id: ID!) {
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
