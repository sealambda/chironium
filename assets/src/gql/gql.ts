/* eslint-disable */
import * as types from './graphql';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query CurrentUser {\n    currentUser {\n      id\n      email\n      person {\n        id\n        givenName\n        stSurname\n        ndSurname\n        birthDate\n      }\n    }\n  }\n": typeof types.CurrentUserDocument,
    "\n  query CustomerList($organisationId: ID!) {\n    customerList(organisationId: $organisationId) {\n      id\n      startDate\n      endDate\n      status\n      person {\n        id\n        givenName\n        stSurname\n        ndSurname\n      }\n    }\n  }\n": typeof types.CustomerListDocument,
    "\n  query AccessibleOrganisations {\n    organisations {\n      id\n      name\n      slug\n      profilePicture\n      themeSeedColor\n    }\n  }\n": typeof types.AccessibleOrganisationsDocument,
    "\n  mutation CreateOrganisation($input: CreateOrganisationInput!) {\n    createOrganisation(input: $input) {\n      result {\n        id\n        name\n        slug\n        profilePicture\n        themeSeedColor\n      }\n      errors {\n        message\n      }\n    }\n  }\n": typeof types.CreateOrganisationDocument,
    "\n  mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) {\n    updatePerson(id: $id, input: $input) {\n      result {\n        id\n        givenName\n        stSurname\n        ndSurname\n        birthDate\n      }\n      errors {\n        message\n      }\n    }\n  }\n": typeof types.UpdatePersonDocument,
};
const documents: Documents = {
    "\n  query CurrentUser {\n    currentUser {\n      id\n      email\n      person {\n        id\n        givenName\n        stSurname\n        ndSurname\n        birthDate\n      }\n    }\n  }\n": types.CurrentUserDocument,
    "\n  query CustomerList($organisationId: ID!) {\n    customerList(organisationId: $organisationId) {\n      id\n      startDate\n      endDate\n      status\n      person {\n        id\n        givenName\n        stSurname\n        ndSurname\n      }\n    }\n  }\n": types.CustomerListDocument,
    "\n  query AccessibleOrganisations {\n    organisations {\n      id\n      name\n      slug\n      profilePicture\n      themeSeedColor\n    }\n  }\n": types.AccessibleOrganisationsDocument,
    "\n  mutation CreateOrganisation($input: CreateOrganisationInput!) {\n    createOrganisation(input: $input) {\n      result {\n        id\n        name\n        slug\n        profilePicture\n        themeSeedColor\n      }\n      errors {\n        message\n      }\n    }\n  }\n": types.CreateOrganisationDocument,
    "\n  mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) {\n    updatePerson(id: $id, input: $input) {\n      result {\n        id\n        givenName\n        stSurname\n        ndSurname\n        birthDate\n      }\n      errors {\n        message\n      }\n    }\n  }\n": types.UpdatePersonDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CurrentUser {\n    currentUser {\n      id\n      email\n      person {\n        id\n        givenName\n        stSurname\n        ndSurname\n        birthDate\n      }\n    }\n  }\n"): (typeof documents)["\n  query CurrentUser {\n    currentUser {\n      id\n      email\n      person {\n        id\n        givenName\n        stSurname\n        ndSurname\n        birthDate\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query CustomerList($organisationId: ID!) {\n    customerList(organisationId: $organisationId) {\n      id\n      startDate\n      endDate\n      status\n      person {\n        id\n        givenName\n        stSurname\n        ndSurname\n      }\n    }\n  }\n"): (typeof documents)["\n  query CustomerList($organisationId: ID!) {\n    customerList(organisationId: $organisationId) {\n      id\n      startDate\n      endDate\n      status\n      person {\n        id\n        givenName\n        stSurname\n        ndSurname\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AccessibleOrganisations {\n    organisations {\n      id\n      name\n      slug\n      profilePicture\n      themeSeedColor\n    }\n  }\n"): (typeof documents)["\n  query AccessibleOrganisations {\n    organisations {\n      id\n      name\n      slug\n      profilePicture\n      themeSeedColor\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateOrganisation($input: CreateOrganisationInput!) {\n    createOrganisation(input: $input) {\n      result {\n        id\n        name\n        slug\n        profilePicture\n        themeSeedColor\n      }\n      errors {\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateOrganisation($input: CreateOrganisationInput!) {\n    createOrganisation(input: $input) {\n      result {\n        id\n        name\n        slug\n        profilePicture\n        themeSeedColor\n      }\n      errors {\n        message\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) {\n    updatePerson(id: $id, input: $input) {\n      result {\n        id\n        givenName\n        stSurname\n        ndSurname\n        birthDate\n      }\n      errors {\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) {\n    updatePerson(id: $id, input: $input) {\n      result {\n        id\n        givenName\n        stSurname\n        ndSurname\n        birthDate\n      }\n      errors {\n        message\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;