/* eslint-disable */
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /**
   * The `Date` scalar type represents a date. The Date appears in a JSON
   * response as an ISO8601 formatted string, without a time component.
   */
  Date: { input: any; output: any; }
  /**
   * The `Decimal` scalar type represents signed double-precision fractional
   * values parsed by the `Decimal` library. The Decimal appears in a JSON
   * response as a string to preserve precision.
   */
  Decimal: { input: any; output: any; }
  /**
   * The `Json` scalar type represents arbitrary json string data, represented as UTF-8
   * character sequences. The Json type is most often used to represent a free-form
   * human-readable json string.
   */
  Json: { input: any; output: any; }
};

export type Contact = {
  contactPoints: Array<ContactPoint>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};


export type ContactContactPointsArgs = {
  filter?: InputMaybe<ContactPointFilterInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<Array<InputMaybe<ContactPointSortInput>>>;
};

export type ContactCreateWithContactPointsContactPointsInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<ContactPointType>;
  value?: InputMaybe<Scalars['String']['input']>;
};

export type ContactFilterId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type ContactFilterInput = {
  and?: InputMaybe<Array<ContactFilterInput>>;
  contactPoints?: InputMaybe<ContactPointFilterInput>;
  id?: InputMaybe<ContactFilterId>;
  name?: InputMaybe<ContactFilterName>;
  not?: InputMaybe<Array<ContactFilterInput>>;
  or?: InputMaybe<Array<ContactFilterInput>>;
};

export type ContactFilterName = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type ContactPoint = {
  contact: Contact;
  contactId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  isPrimary: Scalars['Boolean']['output'];
  label?: Maybe<Scalars['String']['output']>;
  type?: Maybe<ContactPointType>;
  value?: Maybe<Scalars['String']['output']>;
};

export type ContactPointFilterContactId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type ContactPointFilterId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type ContactPointFilterInput = {
  and?: InputMaybe<Array<ContactPointFilterInput>>;
  contact?: InputMaybe<ContactFilterInput>;
  contactId?: InputMaybe<ContactPointFilterContactId>;
  id?: InputMaybe<ContactPointFilterId>;
  isPrimary?: InputMaybe<ContactPointFilterIsPrimary>;
  label?: InputMaybe<ContactPointFilterLabel>;
  not?: InputMaybe<Array<ContactPointFilterInput>>;
  or?: InputMaybe<Array<ContactPointFilterInput>>;
  type?: InputMaybe<ContactPointFilterType>;
  value?: InputMaybe<ContactPointFilterValue>;
};

export type ContactPointFilterIsPrimary = {
  eq?: InputMaybe<Scalars['Boolean']['input']>;
  greaterThan?: InputMaybe<Scalars['Boolean']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['Boolean']['input']>;
  in?: InputMaybe<Array<Scalars['Boolean']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['Boolean']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['Boolean']['input']>;
  notEq?: InputMaybe<Scalars['Boolean']['input']>;
};

export type ContactPointFilterLabel = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type ContactPointFilterType = {
  eq?: InputMaybe<ContactPointType>;
  greaterThan?: InputMaybe<ContactPointType>;
  greaterThanOrEqual?: InputMaybe<ContactPointType>;
  in?: InputMaybe<Array<InputMaybe<ContactPointType>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<ContactPointType>;
  lessThanOrEqual?: InputMaybe<ContactPointType>;
  notEq?: InputMaybe<ContactPointType>;
};

export type ContactPointFilterValue = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type ContactPointSortField =
  | 'CONTACT_ID'
  | 'ID'
  | 'IS_PRIMARY'
  | 'LABEL'
  | 'TYPE'
  | 'VALUE';

export type ContactPointSortInput = {
  field: ContactPointSortField;
  order?: InputMaybe<SortOrder>;
};

export type ContactPointType =
  /** Email address */
  | 'EMAIL'
  /** Instagram username */
  | 'INSTAGRAM'
  /** Phone number */
  | 'PHONE';

export type CreateContactInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type CreateContactPointInput = {
  contactId: Scalars['ID']['input'];
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<ContactPointType>;
  value?: InputMaybe<Scalars['String']['input']>;
};

/** The result of the :create_contact_point mutation */
export type CreateContactPointResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<ContactPoint>;
};

/** The result of the :create_contact mutation */
export type CreateContactResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contact>;
};

export type CreateContactWithContactPointsInput = {
  contactPoints?: InputMaybe<Array<ContactCreateWithContactPointsContactPointsInput>>;
  name?: InputMaybe<Scalars['String']['input']>;
};

/** The result of the :create_contact_with_contact_points mutation */
export type CreateContactWithContactPointsResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contact>;
};

export type CreateOrganizationInput = {
  name: Scalars['String']['input'];
  slug: Scalars['String']['input'];
};

/** The result of the :create_organization mutation */
export type CreateOrganizationResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Organization>;
};

/** A keyset page of :organization */
export type KeysetPageOfOrganization = {
  /** Total count on all pages */
  count?: Maybe<Scalars['Int']['output']>;
  /** The last keyset in the results */
  endKeyset?: Maybe<Scalars['String']['output']>;
  /** The records contained in the page */
  results?: Maybe<Array<Organization>>;
  /** The first keyset in the results */
  startKeyset?: Maybe<Scalars['String']['output']>;
};

/** A keyset page of :subscription */
export type KeysetPageOfSubscription = {
  /** Total count on all pages */
  count?: Maybe<Scalars['Int']['output']>;
  /** The last keyset in the results */
  endKeyset?: Maybe<Scalars['String']['output']>;
  /** The records contained in the page */
  results?: Maybe<Array<Subscription>>;
  /** The first keyset in the results */
  startKeyset?: Maybe<Scalars['String']['output']>;
};

export type Money = {
  amount: Scalars['Decimal']['output'];
  currency: Scalars['String']['output'];
};

export type MoneyInput = {
  amount: Scalars['Decimal']['input'];
  currency: Scalars['String']['input'];
};

/** An error generated by a failed mutation */
export type MutationError = {
  /** An error code for the given error */
  code?: Maybe<Scalars['String']['output']>;
  /** The field or fields that produced the error */
  fields?: Maybe<Array<Scalars['String']['output']>>;
  /** The human readable error message */
  message?: Maybe<Scalars['String']['output']>;
  /** A shorter error message, with vars not replaced */
  shortMessage?: Maybe<Scalars['String']['output']>;
  /** Replacements for the short message */
  vars?: Maybe<Scalars['Json']['output']>;
};

export type Organization = {
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  slug: Scalars['String']['output'];
};

export type RootMutationType = {
  createContact: CreateContactResult;
  createContactPoint: CreateContactPointResult;
  /** Create a contact with initial contact points (email, phone, ...) */
  createContactWithContactPoints: CreateContactWithContactPointsResult;
  createOrganization: CreateOrganizationResult;
  updateContact: UpdateContactResult;
  updateContactPoint: UpdateContactPointResult;
};


export type RootMutationTypeCreateContactArgs = {
  input?: InputMaybe<CreateContactInput>;
};


export type RootMutationTypeCreateContactPointArgs = {
  input: CreateContactPointInput;
};


export type RootMutationTypeCreateContactWithContactPointsArgs = {
  input?: InputMaybe<CreateContactWithContactPointsInput>;
};


export type RootMutationTypeCreateOrganizationArgs = {
  input: CreateOrganizationInput;
};


export type RootMutationTypeUpdateContactArgs = {
  id: Scalars['ID']['input'];
  input?: InputMaybe<UpdateContactInput>;
};


export type RootMutationTypeUpdateContactPointArgs = {
  id: Scalars['ID']['input'];
  input?: InputMaybe<UpdateContactPointInput>;
};

export type RootQueryType = {
  /** Retrieve the info for the actor that is currently signed in. */
  currentActor?: Maybe<User>;
  getOrganization?: Maybe<Organization>;
  getUser?: Maybe<User>;
  listOrganizations?: Maybe<KeysetPageOfOrganization>;
  listSubscriptions?: Maybe<KeysetPageOfSubscription>;
};


export type RootQueryTypeGetUserArgs = {
  filter?: InputMaybe<UserFilterInput>;
};


export type RootQueryTypeListOrganizationsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
};


export type RootQueryTypeListSubscriptionsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<SubscriptionFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<Array<InputMaybe<SubscriptionSortInput>>>;
};

export type SortOrder =
  | 'ASC'
  | 'ASC_NULLS_FIRST'
  | 'ASC_NULLS_LAST'
  | 'DESC'
  | 'DESC_NULLS_FIRST'
  | 'DESC_NULLS_LAST';

export type Subscription = {
  id: Scalars['ID']['output'];
  plan: SubscriptionPlan;
  planId: Scalars['ID']['output'];
  startDate: Scalars['Date']['output'];
  state: Scalars['String']['output'];
  subscriber: Contact;
  subscriberId: Scalars['ID']['output'];
};

export type SubscriptionFilterId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type SubscriptionFilterInput = {
  and?: InputMaybe<Array<SubscriptionFilterInput>>;
  id?: InputMaybe<SubscriptionFilterId>;
  not?: InputMaybe<Array<SubscriptionFilterInput>>;
  or?: InputMaybe<Array<SubscriptionFilterInput>>;
  plan?: InputMaybe<SubscriptionPlanFilterInput>;
  planId?: InputMaybe<SubscriptionFilterPlanId>;
  startDate?: InputMaybe<SubscriptionFilterStartDate>;
  state?: InputMaybe<SubscriptionFilterState>;
  subscriber?: InputMaybe<ContactFilterInput>;
  subscriberId?: InputMaybe<SubscriptionFilterSubscriberId>;
};

export type SubscriptionFilterPlanId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type SubscriptionFilterStartDate = {
  eq?: InputMaybe<Scalars['Date']['input']>;
  greaterThan?: InputMaybe<Scalars['Date']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  in?: InputMaybe<Array<Scalars['Date']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['Date']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  notEq?: InputMaybe<Scalars['Date']['input']>;
};

export type SubscriptionFilterState = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type SubscriptionFilterSubscriberId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type SubscriptionPlan = {
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  periodDuration?: Maybe<Scalars['String']['output']>;
  priceAmount?: Maybe<Money>;
};

export type SubscriptionPlanFilterId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type SubscriptionPlanFilterInput = {
  and?: InputMaybe<Array<SubscriptionPlanFilterInput>>;
  id?: InputMaybe<SubscriptionPlanFilterId>;
  name?: InputMaybe<SubscriptionPlanFilterName>;
  not?: InputMaybe<Array<SubscriptionPlanFilterInput>>;
  or?: InputMaybe<Array<SubscriptionPlanFilterInput>>;
  periodDuration?: InputMaybe<SubscriptionPlanFilterPeriodDuration>;
  priceAmount?: InputMaybe<SubscriptionPlanFilterPriceAmount>;
};

export type SubscriptionPlanFilterName = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type SubscriptionPlanFilterPeriodDuration = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type SubscriptionPlanFilterPriceAmount = {
  eq?: InputMaybe<MoneyInput>;
  greaterThan?: InputMaybe<MoneyInput>;
  greaterThanOrEqual?: InputMaybe<MoneyInput>;
  in?: InputMaybe<Array<InputMaybe<MoneyInput>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<MoneyInput>;
  lessThanOrEqual?: InputMaybe<MoneyInput>;
  notEq?: InputMaybe<MoneyInput>;
};

export type SubscriptionSortField =
  | 'ID'
  | 'PLAN_ID'
  | 'START_DATE'
  | 'STATE'
  | 'SUBSCRIBER_ID';

export type SubscriptionSortInput = {
  field: SubscriptionSortField;
  order?: InputMaybe<SortOrder>;
};

export type UpdateContactInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type UpdateContactPointInput = {
  isPrimary?: InputMaybe<Scalars['Boolean']['input']>;
  label?: InputMaybe<Scalars['String']['input']>;
  value?: InputMaybe<Scalars['String']['input']>;
};

/** The result of the :update_contact_point mutation */
export type UpdateContactPointResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<ContactPoint>;
};

/** The result of the :update_contact mutation */
export type UpdateContactResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contact>;
};

export type User = {
  email: Scalars['String']['output'];
  familyName?: Maybe<Scalars['String']['output']>;
  givenName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  picture?: Maybe<Scalars['String']['output']>;
};

export type UserFilterEmail = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type UserFilterFamilyName = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type UserFilterGivenName = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type UserFilterId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type UserFilterInput = {
  and?: InputMaybe<Array<UserFilterInput>>;
  email?: InputMaybe<UserFilterEmail>;
  familyName?: InputMaybe<UserFilterFamilyName>;
  givenName?: InputMaybe<UserFilterGivenName>;
  id?: InputMaybe<UserFilterId>;
  name?: InputMaybe<UserFilterName>;
  not?: InputMaybe<Array<UserFilterInput>>;
  or?: InputMaybe<Array<UserFilterInput>>;
  picture?: InputMaybe<UserFilterPicture>;
};

export type UserFilterName = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type UserFilterPicture = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  ilike?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  like?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type CurrentActorQueryVariables = Exact<{ [key: string]: never; }>;


export type CurrentActorQuery = { currentActor?: { id: string, email: string } | null };

export type SubscriptionListQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type SubscriptionListQuery = { listSubscriptions?: { results?: Array<{ id: string, state: string, startDate: any, subscriber: { id: string, name?: string | null, contactPoints: Array<{ type?: ContactPointType | null, value?: string | null }> }, plan: { id: string, name?: string | null, periodDuration?: string | null } }> | null } | null };

export type ListOrganizationsQueryVariables = Exact<{
  first?: InputMaybe<Scalars['Int']['input']>;
}>;


export type ListOrganizationsQuery = { listOrganizations?: { results?: Array<{ id: string, name: string, slug: string }> | null } | null };

export type CreateOrganizationMutationVariables = Exact<{
  input: CreateOrganizationInput;
}>;


export type CreateOrganizationMutation = { createOrganization: { result?: { id: string, name: string, slug: string } | null, errors: Array<{ message?: string | null }> } };


export const CurrentActorDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CurrentActor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentActor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}}]}}]} as unknown as DocumentNode<CurrentActorQuery, CurrentActorQueryVariables>;
export const SubscriptionListDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SubscriptionList"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listSubscriptions"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"results"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"state"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"subscriber"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"contactPoints"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"value"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"plan"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"periodDuration"}}]}}]}}]}}]}}]} as unknown as DocumentNode<SubscriptionListQuery, SubscriptionListQueryVariables>;
export const ListOrganizationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListOrganizations"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"first"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"Int"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"listOrganizations"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"first"},"value":{"kind":"Variable","name":{"kind":"Name","value":"first"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"results"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}}]}}]}}]} as unknown as DocumentNode<ListOrganizationsQuery, ListOrganizationsQueryVariables>;
export const CreateOrganizationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateOrganization"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateOrganizationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOrganization"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"result"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}}]}},{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<CreateOrganizationMutation, CreateOrganizationMutationVariables>;