import { HttpResponse } from "msw";
import { db } from "../db";
import type { CreateContactInput, CreateSubscriptionInput } from "../graphql";
import { extractOrgId, gql } from "./utils";

type ContactPointWithId = {
  id: string;
  type?: "EMAIL" | "PHONE" | "INSTAGRAM" | null;
  label?: string | null;
  value?: string | null;
  isPrimary: boolean;
};

type Contact = {
  id: string;
  name?: string | null;
  contactPoints?: ContactPointWithId[] | null;
};

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

  gql.query("ListPlans", () => {
    return HttpResponse.json({
      data: {
        listPlans: {
          results: db.plans,
        },
      },
    });
  }),

  gql.mutation("CreateContactWithContactPoints", ({ variables }) => {
    const input = variables?.input as CreateContactInput | undefined;

    if (!input?.name) {
      return HttpResponse.json({
        data: {
          createContactWithContactPoints: {
            result: null,
            errors: [{ message: "Name is required." }],
          },
        },
      });
    }

    const contactId = `contact-${Date.now()}`;
    const contactPoints =
      input.contactPoints?.map((point, index) => ({
        id: `cp-${contactId}-${index + 1}`,
        type: point.type,
        value: point.value,
        isPrimary: point.isPrimary ?? index === 0,
      })) ?? [];

    const contact: Contact = {
      id: contactId,
      name: input.name,
      contactPoints,
    };

    db.contacts.push(contact as never);

    return HttpResponse.json({
      data: {
        createContactWithContactPoints: {
          result: contact,
          errors: [],
        },
      },
    });
  }),

  gql.mutation("CreateSubscription", ({ request, variables }) => {
    const orgId = extractOrgId(request);
    const input = variables?.input as CreateSubscriptionInput | undefined;

    if (!input?.subscriberId || !input?.planId) {
      return HttpResponse.json({
        data: {
          createSubscription: {
            result: null,
            errors: [{ message: "Subscriber and plan are required." }],
          },
        },
      });
    }

    // Find the contact (could be from seed data or newly created)
    const contact = db.contacts.find((c) => c.id === input.subscriberId);
    // Also check seed subscriptions for existing subscribers
    const existingSub = db.subscriptions.find(
      (s) => s.subscriber.id === input.subscriberId,
    );
    const subscriber = contact ?? existingSub?.subscriber;

    if (!subscriber) {
      return HttpResponse.json({
        data: {
          createSubscription: {
            result: null,
            errors: [{ message: "Subscriber not found." }],
          },
        },
      });
    }

    const plan = db.plans.find((p) => p.id === input.planId);
    if (!plan) {
      return HttpResponse.json({
        data: {
          createSubscription: {
            result: null,
            errors: [{ message: "Plan not found." }],
          },
        },
      });
    }

    const subscriptionId = `sub-${Date.now()}`;
    const subscription = {
      id: subscriptionId,
      organizationId: orgId ?? "",
      state: "active",
      startDate: input.startDate ?? new Date().toISOString().split("T")[0],
      subscriber: {
        id: subscriber.id,
        name: "name" in subscriber ? subscriber.name : null,
        contactPoints:
          "contactPoints" in subscriber ? subscriber.contactPoints : [],
      },
      plan: {
        id: plan.id,
        name: plan.name,
        periodDuration: plan.periodDuration,
      },
      subscriberId: input.subscriberId,
      planId: input.planId,
    };

    db.subscriptions.push(subscription as never);

    return HttpResponse.json({
      data: {
        createSubscription: {
          result: subscription,
          errors: [],
        },
      },
    });
  }),
];
