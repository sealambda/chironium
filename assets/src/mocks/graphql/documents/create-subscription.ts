// TEMPORARY: Remove when backend implements createSubscription mutation

export const CreateSubscriptionMutation = `
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      result {
        id
        startDate
        state
        subscriberId
        planId
      }
      errors {
        message
        fields
      }
    }
  }
`;
