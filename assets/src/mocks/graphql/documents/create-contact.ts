// TEMPORARY: Remove when backend implements createContactWithContactPoints mutation

export const CreateContactMutation = `
  mutation CreateContactWithContactPoints($input: CreateContactWithContactPointsInput!) {
    createContactWithContactPoints(input: $input) {
      result {
        id
        name
        contactPoints {
          id
          type
          value
        }
      }
      errors {
        message
        fields
      }
    }
  }
`;
