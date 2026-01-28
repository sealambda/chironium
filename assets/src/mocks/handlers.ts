import { graphql, HttpResponse } from "msw";

type Organisation = {
  id: string;
  name: string;
  slug: string;
  profilePicture: string | null;
  themeSeedColor: string | null;
};

type Membership = {
  id: string;
  startDate: string;
  endDate: string | null;
  status: string;
  person: {
    id: string;
    givenName: string | null;
    stSurname: string | null;
    ndSurname: string | null;
  };
};

const organisations: Organisation[] = [
  {
    id: "org-1",
    name: "Northwind Wellness",
    slug: "northwind-wellness",
    profilePicture: null,
    themeSeedColor: "#6366f1",
  },
  {
    id: "org-2",
    name: "Blue Harbor Clinic",
    slug: "blue-harbor-clinic",
    profilePicture: null,
    themeSeedColor: "#14b8a6",
  },
];

const membershipsByOrg: Record<string, Membership[]> = {
  "org-1": [
    {
      id: "mem-101",
      startDate: "2025-11-10",
      endDate: "2026-11-10",
      status: "active",
      person: {
        id: "person-201",
        givenName: "Alex",
        stSurname: "Rivera",
        ndSurname: null,
      },
    },
    {
      id: "mem-102",
      startDate: "2025-12-02",
      endDate: null,
      status: "trial",
      person: {
        id: "person-202",
        givenName: "Priya",
        stSurname: "Shah",
        ndSurname: "Patel",
      },
    },
  ],
  "org-2": [
    {
      id: "mem-201",
      startDate: "2025-09-18",
      endDate: "2026-09-18",
      status: "active",
      person: {
        id: "person-301",
        givenName: "Marco",
        stSurname: "Santos",
        ndSurname: null,
      },
    },
    {
      id: "mem-202",
      startDate: "2025-10-06",
      endDate: "2026-04-06",
      status: "paused",
      person: {
        id: "person-302",
        givenName: "Lina",
        stSurname: "Gomez",
        ndSurname: "Vega",
      },
    },
    {
      id: "mem-203",
      startDate: "2026-01-05",
      endDate: null,
      status: "trial",
      person: {
        id: "person-303",
        givenName: "Jonas",
        stSurname: "Keller",
        ndSurname: null,
      },
    },
  ],
};

function createOrganisation(input: { name?: string; slug?: string } | null | undefined) {
  if (!input?.name || !input?.slug) {
    return {
      result: null,
      errors: [{ message: "Name and slug are required." }],
    };
  }

  const newOrg: Organisation = {
    id: `org-${organisations.length + 1}`,
    name: input.name,
    slug: input.slug,
    profilePicture: null,
    themeSeedColor: "#f97316",
  };

  organisations.push(newOrg);
  membershipsByOrg[newOrg.id] = [];

  return {
    result: newOrg,
    errors: [],
  };
}

export const handlers = [
  graphql.query("AccessibleOrganisations", () => {
    return HttpResponse.json({
      data: {
        organisations,
      },
    });
  }),
  graphql.query("CustomerList", ({ variables }) => {
    const organisationId =
      typeof variables?.organisationId === "string" ? variables.organisationId : null;
    const customerList = organisationId ? (membershipsByOrg[organisationId] ?? []) : [];

    return HttpResponse.json({
      data: {
        customerList,
      },
    });
  }),
  graphql.mutation("CreateOrganisation", ({ variables }) => {
    const payload = createOrganisation(variables?.input as { name?: string; slug?: string });

    return HttpResponse.json({
      data: {
        createOrganisation: payload,
      },
    });
  }),
];
