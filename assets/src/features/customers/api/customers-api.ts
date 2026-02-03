import { addMonths, format } from "date-fns";
import { graphql } from "@/gql";
import type { ContactPointType } from "@/gql/graphql";
import { requestGraphql } from "@/shared/api/graphql";
import type { Customer } from "../model/customer-types";

/** Subscription shape returned by our GraphQL queries */
interface SubscriptionResult {
  id: string;
  state: string;
  startDate: string;
  subscriber: {
    id: string;
    name?: string | null;
    contactPoints?: Array<{
      type?: ContactPointType | null;
      value?: string | null;
    }>;
  };
  plan: {
    id: string;
    name?: string | null;
    periodDuration?: string | null;
  };
}

const SubscriptionListQuery = graphql(`
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
`);

const CreateContactWithContactPointsMutation = graphql(`
  mutation CreateContactWithContactPoints($input: CreateContactWithContactPointsInput) {
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
`);

const CreateSubscriptionMutation = graphql(`
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      result {
        id
        state
        startDate
        subscriber {
          id
          name
        }
        plan {
          id
          name
          periodDuration
        }
      }
      errors {
        message
        fields
      }
    }
  }
`);

function parsePlanDurationMonths(periodDuration?: string | null): number {
  if (!periodDuration) return 3;
  const normalized = periodDuration.trim().toLowerCase();
  const isoMatch = /^p(\d+)m$/.exec(normalized);
  if (isoMatch) {
    return Number.parseInt(isoMatch[1] ?? "3", 10);
  }
  const textMatch = /(\d+)\s*(mo|month)/.exec(normalized);
  if (textMatch) {
    return Number.parseInt(textMatch[1] ?? "3", 10);
  }
  return 3;
}

function mapSubscriptionState(state?: string | null): Customer["status"] {
  switch (state) {
    case "active":
      return "up-to-date";
    case "suspended":
      return "needs-attention";
    case "expired":
    case "canceled":
      return "overdue";
    default:
      return "up-to-date";
  }
}

function toCustomer(item: SubscriptionResult): Customer {
  const name = item.subscriber.name?.trim() || "Unknown";
  const planDurationMonths = parsePlanDurationMonths(item.plan.periodDuration);
  const startDate = new Date(item.startDate);
  const endDate = addMonths(startDate, planDurationMonths);
  const nameParts = name.split(/\s+/).filter(Boolean);
  const firstInitial = nameParts.at(0)?.[0] || "";
  const lastInitial = nameParts.at(-1)?.[0] || "";
  const initials =
    `${firstInitial}${lastInitial || firstInitial}`.toUpperCase() || "?";

  const email = item.subscriber.contactPoints?.find(
    (point) => point.type === "EMAIL",
  )?.value;
  const phone = item.subscriber.contactPoints?.find(
    (point) => point.type === "PHONE",
  )?.value;
  const instagram = item.subscriber.contactPoints?.find(
    (point) => point.type === "INSTAGRAM",
  )?.value;

  // Build customer object
  // Status is mapped from backend state field
  return {
    id: item.subscriber.id,
    name,
    initials,
    status: mapStateToStatus(item.state),
    subscription: {
      startDate,
      planDurationMonths,
      endDate,
    },
    contact: {
      email: email || undefined,
      phone: phone || undefined,
      instagram: instagram || undefined,
    },
  };
}

const CreateContactWithContactPointsMutation = graphql(`
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
`);

const CreateSubscriptionMutation = graphql(`
  mutation CreateSubscription($input: CreateSubscriptionInput!) {
    createSubscription(input: $input) {
      result {
        id
        startDate
        state
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
      errors {
        message
        fields
      }
    }
  }
`);

/**
 * Fetch and transform customer list for a given organisation.
 *
 * @param organisationId - The ID of the organisation.
 * @returns Array of transformed customer objects.
 * @throws Error if the fetch fails or GraphQL returns errors.
 */
export async function fetchCustomerList(
  organizationId: string,
): Promise<Customer[]> {
  if (!organizationId) {
    return [];
  }

  const result = await requestGraphql({
    document: SubscriptionListQuery,
    variables: { first: 250 },
    organizationId,
  });

  const subscriptions = result.listSubscriptions?.results ?? [];
  return subscriptions.map(toCustomer);
}

/** Input type for creating a customer */
export interface CreateCustomerInput {
  name: string;
  contact: {
    email?: string;
    phone?: string;
    instagram?: string;
  };
  subscription: {
    startDate: Date;
    planId: string;
  };
}

/**
 * Create a new customer with contact points and subscription.
 *
 * @param organizationId - The ID of the organisation.
 * @param input - Customer data including name, contact info, and subscription details.
 * @returns The created customer data.
 * @throws Error if creation fails.
 */
export async function createCustomer(
  organizationId: string,
  input: CreateCustomerInput,
): Promise<Customer> {
  // Build contact points array from input
  const contactPoints: Array<{
    type: ContactPointType;
    value: string;
    isPrimary: boolean;
  }> = [];

  if (input.contact.email) {
    contactPoints.push({
      type: "EMAIL" as ContactPointType,
      value: input.contact.email,
      isPrimary: true,
    });
  }

  if (input.contact.phone) {
    contactPoints.push({
      type: "PHONE" as ContactPointType,
      value: input.contact.phone,
      isPrimary: false,
    });
  }

  if (input.contact.instagram) {
    contactPoints.push({
      type: "INSTAGRAM" as ContactPointType,
      value: input.contact.instagram,
      isPrimary: false,
    });
  }

  // Step 1: Create contact with contact points
  const contactResult = await requestGraphql({
    document: CreateContactWithContactPointsMutation,
    variables: {
      input: {
        name: input.name,
        contactPoints,
      },
    },
    organizationId,
  });

  const contactPayload = contactResult.createContactWithContactPoints;
  const contact = contactPayload.result;
  const contactErrors = contactPayload.errors;

  if (!contact || contactErrors.length > 0) {
    const errorMessage =
      contactErrors.map((e) => e.message).join(", ") ||
      "Failed to create contact";
    throw new Error(errorMessage);
  }

  // Step 2: Create subscription for the contact
  const subscriptionResult = await requestGraphql({
    document: CreateSubscriptionMutation,
    variables: {
      input: {
        subscriberId: contact.id,
        planId: input.subscription.planId,
        startDate: format(input.subscription.startDate, "yyyy-MM-dd"),
      },
    },
    organizationId,
  });

  const subscriptionPayload = subscriptionResult.createSubscription;
  const subscription = subscriptionPayload.result;
  const subscriptionErrors = subscriptionPayload.errors;

  if (!subscription || subscriptionErrors.length > 0) {
    const errorMessage =
      subscriptionErrors.map((e) => e.message).join(", ") ||
      "Failed to create subscription";
    throw new Error(errorMessage);
  }

  // Transform and return the created customer
  return toCustomer(subscription);
}
