import { HttpResponse } from "msw";

import type { Organization } from "@/gql/graphql";

import { db } from "../db";
import { gql } from "./utils";

export const organizationHandlers = [
  gql.query("ListOrganizations", () => {
    return HttpResponse.json({
      data: {
        listOrganizations: {
          results: db.organizations,
        },
      },
    });
  }),

  gql.mutation("CreateOrganization", ({ variables }) => {
    const input = variables?.input as
      | { name?: string; slug?: string }
      | undefined;

    if (!input?.name || !input?.slug) {
      return HttpResponse.json({
        data: {
          createOrganization: {
            result: null,
            errors: [{ message: "Name and slug are required." }],
          },
        },
      });
    }

    const newOrg: Organization = {
      id: `org-${db.organizations.length + 1}`,
      name: input.name,
      slug: input.slug,
    };

    db.organizations.push(newOrg);

    return HttpResponse.json({
      data: {
        createOrganization: {
          result: newOrg,
          errors: [],
        },
      },
    });
  }),
];
