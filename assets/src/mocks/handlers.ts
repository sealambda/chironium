import { graphql, HttpResponse } from "msw";
import type { Membership, Organisation, Person, User } from "@/gql/graphql";
import { API_PATHS } from "@/shared/utils/url-utils";

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

// Contact info by person ID (not in GraphQL schema yet, but needed for mock).
const contactByPersonId: Record<
  string,
  { email?: string; phone?: string; instagram?: string }
> = {
  "person-sara": {
    email: "saraoleamartin@gmail.com",
    phone: "+34695269851",
    instagram: "@Saraom93",
  },
  "person-berta": {
    email: "bertaguaschf@gmail.com",
    phone: "+34601366557",
    instagram: "@tuskituski__",
  },
  "person-lorena": {
    email: "lorenaafonso2222@gmail.com",
    phone: "+34677089553",
    instagram: "@lorenaafonso_",
  },
  "person-jessica": {
    email: "laubaldica@gmail.com",
    phone: "+34619260307",
    instagram: undefined,
  },
  "person-tania": {
    email: "trodriguezescriche@hotmail.com",
    phone: "+34627697917",
    instagram: "@tania_r_e",
  },
  "person-laura": {
    email: "akelau@gmail.com",
    phone: "+34600299114",
    instagram: undefined,
  },
  "person-sara-m": {
    email: "zarahmuru@gmail.com",
    phone: "+34600778198",
    instagram: undefined,
  },
  "person-carmen": {
    email: "carmengonzriv97@gmail.com",
    phone: "+34622192710",
    instagram: "@carmenkuki97",
  },
  "person-sara-r": {
    email: "sarotaroman_89@hotmail.com",
    phone: "+34678236894",
    instagram: "@sarabailasola",
  },
  "person-isabel": {
    email: "elise.castes@gmail.com",
    phone: "+34635523837",
    instagram: "@isabeelace",
  },
};

// Mock person data store.
const personsById: Record<string, Person> = {
  "person-1": currentUser.person,
  "person-sara": {
    id: "person-sara",
    givenName: "Sara",
    stSurname: "Olea",
    ndSurname: "Martín",
    birthDate: "1993-01-01",
  },
  "person-berta": {
    id: "person-berta",
    givenName: "Berta",
    stSurname: "Guasch",
    ndSurname: null,
    birthDate: "1990-01-01",
  },
  "person-lorena": {
    id: "person-lorena",
    givenName: "Lorena",
    stSurname: "Alfonso",
    ndSurname: null,
    birthDate: "1992-01-01",
  },
  "person-jessica": {
    id: "person-jessica",
    givenName: "Jessica",
    stSurname: "Mújica",
    ndSurname: null,
    birthDate: "1991-01-01",
  },
  "person-tania": {
    id: "person-tania",
    givenName: "Tania",
    stSurname: "Rodríguez",
    ndSurname: null,
    birthDate: "1994-01-01",
  },
  "person-laura": {
    id: "person-laura",
    givenName: "Laura",
    stSurname: "Blasco",
    ndSurname: null,
    birthDate: "1989-01-01",
  },
  "person-sara-m": {
    id: "person-sara-m",
    givenName: "Sara",
    stSurname: "Muñoz",
    ndSurname: null,
    birthDate: "1990-01-01",
  },
  "person-carmen": {
    id: "person-carmen",
    givenName: "Carmen",
    stSurname: "González",
    ndSurname: null,
    birthDate: "1997-01-01",
  },
  "person-sara-r": {
    id: "person-sara-r",
    givenName: "Sara",
    stSurname: "Román",
    ndSurname: null,
    birthDate: "1989-01-01",
  },
  "person-isabel": {
    id: "person-isabel",
    givenName: "Isabel",
    stSurname: "Castell",
    ndSurname: null,
    birthDate: "1992-01-01",
  },
};

const organisations: Organisation[] = [
  {
    id: "org-sealambda",
    name: "SeaLambda",
    slug: "sealambda",
    profilePicture: null,
    themeSeedColor: "#3B82F6",
  },
  {
    id: "org-comunidad-mujeres-alfa",
    name: "Comunidad Mujeres Alfa",
    slug: "comunidad-mujeres-alfa",
    profilePicture: null,
    themeSeedColor: "#EC4899",
  },
];

const membershipsByOrg: Record<string, Membership[]> = {
  "org-sealambda": [],
  "org-comunidad-mujeres-alfa": [
    {
      id: "mem-sara",
      startDate: "2025-11-25",
      endDate: "2026-11-25",
      status: "active",
      person: personsById["person-sara"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-sara",
    },
    {
      id: "mem-berta",
      startDate: "2025-12-09",
      endDate: "2026-06-09",
      status: "active",
      person: personsById["person-berta"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-berta",
    },
    {
      id: "mem-lorena",
      startDate: "2025-12-12",
      endDate: "2026-06-12",
      status: "active",
      person: personsById["person-lorena"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-lorena",
    },
    {
      id: "mem-jessica",
      startDate: "2025-12-12",
      endDate: "2026-06-12",
      status: "active",
      person: personsById["person-jessica"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-jessica",
    },
    {
      id: "mem-tania",
      startDate: "2026-01-05",
      endDate: "2026-07-05",
      status: "active",
      person: personsById["person-tania"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-tania",
    },
    {
      id: "mem-laura",
      startDate: "2025-12-15",
      endDate: "2026-06-15",
      status: "active",
      person: personsById["person-laura"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-laura",
    },
    {
      id: "mem-sara-m",
      startDate: "2025-12-15",
      endDate: "2026-12-15",
      status: "active",
      person: personsById["person-sara-m"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-sara-m",
    },
    {
      id: "mem-carmen",
      startDate: "2025-12-15",
      endDate: "2026-06-15",
      status: "active",
      person: personsById["person-carmen"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-carmen",
    },
    {
      id: "mem-sara-r",
      startDate: "2025-12-17",
      endDate: "2026-06-17",
      status: "active",
      person: personsById["person-sara-r"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-sara-r",
    },
    {
      id: "mem-isabel",
      startDate: "2025-12-19",
      endDate: "2026-06-19",
      status: "active",
      person: personsById["person-isabel"],
      organisation: organisations[1],
      organisationId: "org-comunidad-mujeres-alfa",
      personId: "person-isabel",
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
const gql = graphql.link(API_PATHS.graphql);

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
    const memberships = organisationId
      ? (membershipsByOrg[organisationId] ?? [])
      : [];

    // Extend memberships with contact info for mock purposes.
    const customerList = memberships.map((m) => ({
      ...m,
      contact: contactByPersonId[m.personId] ?? {},
    }));

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
