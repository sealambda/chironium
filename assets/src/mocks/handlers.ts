import { graphql, HttpResponse } from "msw";
import type { ContactPointType, Organization, User } from "@/gql/graphql";
import { API_PATHS } from "@/shared/utils/url-utils";

type CreateOrganizationPayload = {
  result: Organization | null;
  errors: Array<{ message?: string | null }>;
};

type ContactPointInput = {
  id?: string;
  type?: ContactPointType | null;
  label?: string | null;
  value?: string | null;
  isPrimary: boolean;
};

type ContactPoint = ContactPointInput & {
  id: string;
};

type Contact = {
  id: string;
  name?: string | null;
  contactPoints?: ContactPoint[] | null;
};

type SubscriptionSeed = {
  id: string;
  organizationId: string;
  state: string;
  startDate: string;
  subscriber: {
    id: string;
    name?: string | null;
    contactPoints?: ContactPointInput[] | null;
  };
  plan: {
    id: string;
    name?: string | null;
    periodDuration?: string | null;
  };
};

type CreateContactPayload = {
  result: Contact | null;
  errors: Array<{ message?: string | null }>;
};

type SubscriptionResult = {
  id: string;
  state: string;
  startDate: string;
  subscriber: {
    id: string;
    name?: string | null;
  };
  plan: {
    id: string;
    name?: string | null;
    periodDuration?: string | null;
  };
};

type CreateSubscriptionPayload = {
  result: SubscriptionResult | null;
  errors: Array<{ message?: string | null; fields?: string[] | null }>;
};

// Mock current actor data.
const currentActor: User = {
  id: "user-1",
  email: "admin@example.com",
  picture: null,
  name: "Admin User",
  familyName: "User",
  givenName: "Admin",
};

const organizations: Organization[] = [
  {
    id: "org-sealambda",
    name: "SeaLambda",
    slug: "sealambda",
  },
  {
    id: "org-comunidad-mujeres-alfa",
    name: "Comunidad Mujeres Alfa",
    slug: "comunidad-mujeres-alfa",
  },
];

const contacts: Contact[] = [];

const subscriptions: SubscriptionSeed[] = [
  {
    id: "sub-comunidad-sara",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2025-11-25",
    subscriber: {
      id: "contact-sara",
      name: "Sara Olea Martín",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "saraoleamartin@gmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34695269851",
          isPrimary: false,
        },
        {
          type: "INSTAGRAM",
          label: "Instagram",
          value: "@Saraom93",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-12m",
      name: "12 month plan",
      periodDuration: "P12M",
    },
  },
  {
    id: "sub-comunidad-berta",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2025-12-09",
    subscriber: {
      id: "contact-berta",
      name: "Berta Guasch",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "bertaguaschf@gmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34601366557",
          isPrimary: false,
        },
        {
          type: "INSTAGRAM",
          label: "Instagram",
          value: "@tuskituski__",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-6m",
      name: "6 month plan",
      periodDuration: "P6M",
    },
  },
  {
    id: "sub-comunidad-lorena",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2025-12-12",
    subscriber: {
      id: "contact-lorena",
      name: "Lorena Alfonso",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "lorenaafonso2222@gmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34677089553",
          isPrimary: false,
        },
        {
          type: "INSTAGRAM",
          label: "Instagram",
          value: "@lorenaafonso_",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-6m",
      name: "6 month plan",
      periodDuration: "P6M",
    },
  },
  {
    id: "sub-comunidad-jessica",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2025-12-12",
    subscriber: {
      id: "contact-jessica",
      name: "Jessica Mújica",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "laubaldica@gmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34619260307",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-6m",
      name: "6 month plan",
      periodDuration: "P6M",
    },
  },
  {
    id: "sub-comunidad-tania",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2026-01-05",
    subscriber: {
      id: "contact-tania",
      name: "Tania Rodríguez",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "trodriguezescriche@hotmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34627697917",
          isPrimary: false,
        },
        {
          type: "INSTAGRAM",
          label: "Instagram",
          value: "@tania_r_e",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-6m",
      name: "6 month plan",
      periodDuration: "P6M",
    },
  },
  {
    id: "sub-comunidad-laura",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2025-12-19",
    subscriber: {
      id: "contact-laura",
      name: "Laura Blasco",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "akelau@gmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34600299114",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-12m",
      name: "12 month plan",
      periodDuration: "P12M",
    },
  },
  {
    id: "sub-comunidad-sara-m",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2025-12-23",
    subscriber: {
      id: "contact-sara-m",
      name: "Sara Muñoz",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "zarahmuru@gmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34600778198",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-6m",
      name: "6 month plan",
      periodDuration: "P6M",
    },
  },
  {
    id: "sub-comunidad-carmen",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2025-12-28",
    subscriber: {
      id: "contact-carmen",
      name: "Carmen González",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "carmengonzriv97@gmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34622192710",
          isPrimary: false,
        },
        {
          type: "INSTAGRAM",
          label: "Instagram",
          value: "@carmenkuki97",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-6m",
      name: "6 month plan",
      periodDuration: "P6M",
    },
  },
  {
    id: "sub-comunidad-sara-r",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2026-01-02",
    subscriber: {
      id: "contact-sara-r",
      name: "Sara Román",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "sarotaroman_89@hotmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34678236894",
          isPrimary: false,
        },
        {
          type: "INSTAGRAM",
          label: "Instagram",
          value: "@sarabailasola",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-6m",
      name: "6 month plan",
      periodDuration: "P6M",
    },
  },
  {
    id: "sub-comunidad-isabel",
    organizationId: "org-comunidad-mujeres-alfa",
    state: "active",
    startDate: "2026-01-06",
    subscriber: {
      id: "contact-isabel",
      name: "Isabel Castell",
      contactPoints: [
        {
          type: "EMAIL",
          label: "Email",
          value: "elise.castes@gmail.com",
          isPrimary: true,
        },
        {
          type: "PHONE",
          label: "Phone",
          value: "+34635523837",
          isPrimary: false,
        },
        {
          type: "INSTAGRAM",
          label: "Instagram",
          value: "@isabeelace",
          isPrimary: false,
        },
      ],
    },
    plan: {
      id: "plan-6m",
      name: "6 month plan",
      periodDuration: "P6M",
    },
  },
];

function createOrganization(input?: {
  name?: string;
  slug?: string;
}): CreateOrganizationPayload {
  if (!input?.name || !input?.slug) {
    return {
      result: null,
      errors: [{ message: "Name and slug are required." }],
    };
  }

  const newOrg: Organization = {
    id: `org-${organizations.length + 1}`,
    name: input.name,
    slug: input.slug,
  };

  organizations.push(newOrg);

  return {
    result: newOrg,
    errors: [],
  };
}

function createContact(input?: {
  name?: string;
  contactPoints?: ContactPointInput[] | null;
}): CreateContactPayload {
  if (!input?.name) {
    return {
      result: null,
      errors: [{ message: "Name is required." }],
    };
  }

  const contactId = `contact-${contacts.length + 1}`;
  const contactPoints =
    input.contactPoints?.map((point, index) => ({
      ...point,
      id: point.id || `cp-${contactId}-${index + 1}`,
      isPrimary: point.isPrimary ?? index === 0,
    })) ?? [];

  const contact: Contact = {
    id: contactId,
    name: input.name,
    contactPoints,
  };

  contacts.push(contact);

  return {
    result: contact,
    errors: [],
  };
}

/** Available plans that can be referenced when creating subscriptions */
const plans: Record<string, { name: string; periodDuration: string }> = {
  "plan-3m": { name: "3 month plan", periodDuration: "P3M" },
  "plan-6m": { name: "6 month plan", periodDuration: "P6M" },
  "plan-12m": { name: "12 month plan", periodDuration: "P12M" },
};

function createSubscription(
  organizationId: string,
  input?: {
    subscriberId?: string;
    planId?: string;
    startDate?: string;
  },
): CreateSubscriptionPayload {
  if (!input?.subscriberId || !input?.planId || !input?.startDate) {
    return {
      result: null,
      errors: [
        { message: "subscriberId, planId, and startDate are required." },
      ],
    };
  }

  // Find the contact (subscriber)
  const contact = contacts.find((c) => c.id === input.subscriberId);
  if (!contact) {
    return {
      result: null,
      errors: [{ message: `Subscriber not found: ${input.subscriberId}` }],
    };
  }

  // Find the plan
  const plan = plans[input.planId];
  if (!plan) {
    return {
      result: null,
      errors: [{ message: `Plan not found: ${input.planId}` }],
    };
  }

  const subscriptionId = `sub-${subscriptions.length + 1}`;
  const subscription: SubscriptionSeed = {
    id: subscriptionId,
    organizationId,
    state: "active",
    startDate: input.startDate,
    subscriber: {
      id: contact.id,
      name: contact.name,
      contactPoints: contact.contactPoints,
    },
    plan: {
      id: input.planId,
      name: plan.name,
      periodDuration: plan.periodDuration,
    },
  };

  subscriptions.push(subscription);

  return {
    result: {
      id: subscriptionId,
      state: subscription.state,
      startDate: subscription.startDate,
      subscriber: {
        id: contact.id,
        name: contact.name,
      },
      plan: {
        id: input.planId,
        name: plan.name,
        periodDuration: plan.periodDuration,
      },
    },
    errors: [],
  };
}

// Create a GraphQL link for the specific endpoint.
const gql = graphql.link(API_PATHS.graphql);

export const handlers = [
  gql.query("CurrentActor", () => {
    return HttpResponse.json({
      data: {
        currentActor,
      },
    });
  }),

  gql.query("ListOrganizations", () => {
    return HttpResponse.json({
      data: {
        listOrganizations: {
          results: organizations,
        },
      },
    });
  }),

  gql.query("SubscriptionList", ({ request }) => {
    // Header format is "org_${organizationId}", strip prefix for matching
    const orgIdHeader = request.headers.get("x-chironium-organizationid");
    const orgId = orgIdHeader?.startsWith("org_")
      ? orgIdHeader.slice(4)
      : orgIdHeader;
    const results = orgId
      ? subscriptions.filter((sub) => sub.organizationId === orgId)
      : subscriptions;

    return HttpResponse.json({
      data: {
        listSubscriptions: {
          results,
        },
      },
    });
  }),

  gql.mutation("CreateOrganization", ({ variables }) => {
    const payload = createOrganization(
      variables?.input as { name?: string; slug?: string } | undefined,
    );

    return HttpResponse.json({
      data: {
        createOrganization: payload,
      },
    });
  }),

  gql.mutation("CreateContactWithContactPoints", ({ variables }) => {
    const payload = createContact(
      variables?.input as
        | { name?: string; contactPoints?: ContactPoint[] | null }
        | undefined,
    );

    return HttpResponse.json({
      data: {
        createContactWithContactPoints: payload,
      },
    });
  }),

  gql.mutation("CreateSubscription", ({ variables, request }) => {
    // Extract organization ID from header for associating subscription
    const orgIdHeader = request.headers.get("x-chironium-organizationid");
    const orgId = orgIdHeader?.startsWith("org_")
      ? orgIdHeader.slice(4)
      : (orgIdHeader ?? "");

    const payload = createSubscription(
      orgId,
      variables?.input as
        | { subscriberId?: string; planId?: string; startDate?: string }
        | undefined,
    );

    return HttpResponse.json({
      data: {
        createSubscription: payload,
      },
    });
  }),
];
