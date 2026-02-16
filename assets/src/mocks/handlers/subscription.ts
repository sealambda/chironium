import { HttpResponse } from "msw";

import { db } from "../db";
import { extractOrgId, gql } from "./utils";

export const subscriptionHandlers = [
  gql.query("SubscriptionList", ({ request }) => {
    const orgId = extractOrgId(request);
    const results = orgId
      ? db.subscriptions.filter((sub) => sub.organizationId === orgId)
      : db.subscriptions;

    return HttpResponse.json({
      data: {
        listSubscriptions: {
          results,
        },
      },
    });
  }),
];
