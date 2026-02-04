// TEMPORARY: Remove when backend implements listPlans query

export const ListPlansQuery = `
  query ListPlans {
    listPlans {
      results {
        id
        name
        periodDuration
      }
    }
  }
`;
