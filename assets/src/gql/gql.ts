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
    "\n  query CurrentActor {\n    currentActor {\n      id\n      email\n    }\n  }\n": typeof types.CurrentActorDocument,
    "\n  query SubscriptionList($first: Int) {\n    listSubscriptions(first: $first) {\n      results {\n        id\n        state\n        startDate\n        subscriber {\n          id\n          name\n          contactPoints {\n            type\n            value\n          }\n        }\n        plan {\n          id\n          name\n          periodDuration\n        }\n      }\n    }\n  }\n": typeof types.SubscriptionListDocument,
    "\n  query ListOrganizations($first: Int) {\n    listOrganizations(first: $first) {\n      results {\n        id\n        name\n        slug\n      }\n    }\n  }\n": typeof types.ListOrganizationsDocument,
    "\n  mutation CreateOrganization($input: CreateOrganizationInput!) {\n    createOrganization(input: $input) {\n      result {\n        id\n        name\n        slug\n      }\n      errors {\n        message\n      }\n    }\n  }\n": typeof types.CreateOrganizationDocument,
};
const documents: Documents = {
    "\n  query CurrentActor {\n    currentActor {\n      id\n      email\n    }\n  }\n": types.CurrentActorDocument,
    "\n  query SubscriptionList($first: Int) {\n    listSubscriptions(first: $first) {\n      results {\n        id\n        state\n        startDate\n        subscriber {\n          id\n          name\n          contactPoints {\n            type\n            value\n          }\n        }\n        plan {\n          id\n          name\n          periodDuration\n        }\n      }\n    }\n  }\n": types.SubscriptionListDocument,
    "\n  query ListOrganizations($first: Int) {\n    listOrganizations(first: $first) {\n      results {\n        id\n        name\n        slug\n      }\n    }\n  }\n": types.ListOrganizationsDocument,
    "\n  mutation CreateOrganization($input: CreateOrganizationInput!) {\n    createOrganization(input: $input) {\n      result {\n        id\n        name\n        slug\n      }\n      errors {\n        message\n      }\n    }\n  }\n": types.CreateOrganizationDocument,
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
export function graphql(source: "\n  query CurrentActor {\n    currentActor {\n      id\n      email\n    }\n  }\n"): (typeof documents)["\n  query CurrentActor {\n    currentActor {\n      id\n      email\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SubscriptionList($first: Int) {\n    listSubscriptions(first: $first) {\n      results {\n        id\n        state\n        startDate\n        subscriber {\n          id\n          name\n          contactPoints {\n            type\n            value\n          }\n        }\n        plan {\n          id\n          name\n          periodDuration\n        }\n      }\n    }\n  }\n"): (typeof documents)["\n  query SubscriptionList($first: Int) {\n    listSubscriptions(first: $first) {\n      results {\n        id\n        state\n        startDate\n        subscriber {\n          id\n          name\n          contactPoints {\n            type\n            value\n          }\n        }\n        plan {\n          id\n          name\n          periodDuration\n        }\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ListOrganizations($first: Int) {\n    listOrganizations(first: $first) {\n      results {\n        id\n        name\n        slug\n      }\n    }\n  }\n"): (typeof documents)["\n  query ListOrganizations($first: Int) {\n    listOrganizations(first: $first) {\n      results {\n        id\n        name\n        slug\n      }\n    }\n  }\n"];
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateOrganization($input: CreateOrganizationInput!) {\n    createOrganization(input: $input) {\n      result {\n        id\n        name\n        slug\n      }\n      errors {\n        message\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation CreateOrganization($input: CreateOrganizationInput!) {\n    createOrganization(input: $input) {\n      result {\n        id\n        name\n        slug\n      }\n      errors {\n        message\n      }\n    }\n  }\n"];

export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;