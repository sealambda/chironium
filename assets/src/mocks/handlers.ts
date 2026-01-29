import { graphql, HttpResponse } from "msw";
import {
  type Organisation,
  type Membership,
  type Person,
  type User,
} from "@/gql/graphql";
import { BACKEND_URL } from "@/shared/utils";

// Mock current user data.
const currentUser: User = {
  id: "user-1",
  email: "admin@example.com",
  person: {
    id: "person-1",
    givenName: "Jordan",
    stSurname: "Taylor",
    ndSurname: "Tovar",
    birthDate: "1990-05-15",
  },
};

// Mock person data store.
const personsById: Record<string, Person> = {
  "person-1": currentUser.person,
  "person-201": {
    id: "person-201",
    givenName: "Alex",
    stSurname: "Rivera",
    ndSurname: "Martinez",
    birthDate: "1985-03-22",
  },
  "person-202": {
    id: "person-202",
    givenName: "Priya",
    stSurname: "Shah",
    ndSurname: "Patel",
    birthDate: "1992-07-08",
  },
  "person-301": {
    id: "person-301",
    givenName: "Marco",
    stSurname: "Santos",
    ndSurname: "Garcia",
    birthDate: "1988-11-30",
  },
  "person-302": {
    id: "person-302",
    givenName: "Lina",
    stSurname: "Gomez",
    ndSurname: "Vega",
    birthDate: "1995-02-14",
  },
  "person-303": {
    id: "person-303",
    givenName: "Jonas",
    stSurname: "Keller",
    ndSurname: "Smith",
    birthDate: "1991-09-19",
  },
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
      person: personsById["person-201"],
      organisation: organisations[0],
      organisationId: "org-1",
      personId: "person-201",
    },
    {
      id: "mem-102",
      startDate: "2025-12-02",
      endDate: null,
      status: "trial",
      person: personsById["person-202"],
      organisation: organisations[0],
      organisationId: "org-1",
      personId: "person-202",
    },
  ],
  "org-2": [
    {
      id: "mem-201",
      startDate: "2025-09-18",
      endDate: "2026-09-18",
      status: "active",
      person: personsById["person-301"],
      organisation: organisations[1],
      organisationId: "org-2",
      personId: "person-301",
    },
    {
      id: "mem-202",
      startDate: "2025-10-06",
      endDate: "2026-04-06",
      status: "paused",
      person: personsById["person-302"],
      organisation: organisations[1],
      organisationId: "org-2",
      personId: "person-302",
    },
    {
      id: "mem-203",
      startDate: "2026-01-05",
      endDate: null,
      status: "trial",
      person: personsById["person-303"],
      organisation: organisations[1],
      organisationId: "org-2",
      personId: "person-303",
    },
  ],
};

function createOrganisation(
  input: { name?: string; slug?: string } | null | undefined,
) {
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

function updatePerson(
  id: string,
  input:
    | {
        givenName?: string | null;
        stSurname?: string | null;
        ndSurname?: string | null;
        birthDate?: string | null;
      }
    | null
    | undefined,
) {
  const person = personsById[id];
  if (!person) {
    return {
      result: null,
      errors: [{ message: `Person with id ${id} not found.` }],
    };
  }

  // Update person fields.
  if (input?.givenName !== undefined) {
    person.givenName = input.givenName;
  }
  if (input?.stSurname !== undefined) {
    person.stSurname = input.stSurname;
  }
  if (input?.ndSurname !== undefined) {
    person.ndSurname = input.ndSurname;
  }
  if (input?.birthDate !== undefined) {
    person.birthDate = input.birthDate;
  }

  return {
    result: person,
    errors: [],
  };
}

// Create a GraphQL link for the specific endpoint.
const gql = graphql.link(`${BACKEND_URL}/gql`);

export const handlers = [
  gql.query("CurrentUser", () => {
    return HttpResponse.json({
      data: {
        currentUser,
      },
    });
  }),

  gql.query("AccessibleOrganisations", () => {
    return HttpResponse.json({
      data: {
        organisations,
      },
    });
  }),

  gql.query("CustomerList", ({ variables }) => {
    const organisationId =
      typeof variables?.organisationId === "string"
        ? variables.organisationId
        : null;
    const customerList = organisationId
      ? (membershipsByOrg[organisationId] ?? [])
      : [];

    return HttpResponse.json({
      data: {
        customerList,
      },
    });
  }),

  gql.mutation("CreateOrganisation", ({ variables }) => {
    const payload = createOrganisation(
      variables?.input as { name?: string; slug?: string },
    );

    return HttpResponse.json({
      data: {
        createOrganisation: payload,
      },
    });
  }),

  gql.mutation("UpdatePerson", ({ variables }) => {
    const id = typeof variables?.id === "string" ? variables.id : "";
    const payload = updatePerson(
      id,
      variables?.input as
        | {
            givenName?: string | null;
            stSurname?: string | null;
            ndSurname?: string | null;
            birthDate?: string | null;
          }
        | null
        | undefined,
    );

    return HttpResponse.json({
      data: {
        updatePerson: payload,
      },
    });
  }),
];
