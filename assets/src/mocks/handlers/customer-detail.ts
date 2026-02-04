import { HttpResponse } from "msw";
import { db } from "../db";
import { gql } from "./utils";

export const customerDetailHandlers = [
  gql.query("SubscriptionHistory", ({ variables }) => {
    const customerId = variables?.customerId as string | undefined;
    const results = customerId
      ? db.subscriptionHistory.filter((r) => r.customerId === customerId)
      : [];

    return HttpResponse.json({
      data: {
        subscriptionHistory: {
          results,
        },
      },
    });
  }),

  gql.query("BodyMetricsHistory", ({ variables }) => {
    const customerId = variables?.customerId as string | undefined;
    const results = customerId
      ? db.bodyMetrics.filter((r) => r.customerId === customerId)
      : [];

    return HttpResponse.json({
      data: {
        bodyMetricsHistory: {
          results,
        },
      },
    });
  }),

  gql.query("NutritionPlansHistory", ({ variables }) => {
    const customerId = variables?.customerId as string | undefined;
    const results = customerId
      ? db.nutritionPlans.filter((r) => r.customerId === customerId)
      : [];

    return HttpResponse.json({
      data: {
        nutritionPlansHistory: {
          results,
        },
      },
    });
  }),

  gql.query("CycleHistory", ({ variables }) => {
    const customerId = variables?.customerId as string | undefined;
    const results = customerId
      ? db.cycleHistory.filter((r) => r.customerId === customerId)
      : [];

    return HttpResponse.json({
      data: {
        cycleHistory: {
          results,
        },
      },
    });
  }),

  gql.query("PathologiesList", ({ variables }) => {
    const customerId = variables?.customerId as string | undefined;
    const results = customerId
      ? db.pathologies.filter((r) => r.customerId === customerId)
      : [];

    return HttpResponse.json({
      data: {
        pathologiesList: {
          results,
        },
      },
    });
  }),
];
