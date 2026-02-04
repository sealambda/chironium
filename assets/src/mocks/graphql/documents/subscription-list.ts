// TEMPORARY: Remove when backend implements listSubscriptions query

export const SubscriptionListQuery = `
  query SubscriptionList($first: Int) {
    listSubscriptions(first: $first) {
      results {
        id
        state
        startDate
        subscriber {
          id
          name
          contactPoints {
            type
            value
          }
        }
        plan {
          id
          name
          periodDuration
        }
      }
    }
  }
`;
