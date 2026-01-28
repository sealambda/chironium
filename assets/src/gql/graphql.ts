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
   * The `Json` scalar type represents arbitrary json string data, represented as UTF-8
   * character sequences. The Json type is most often used to represent a free-form
   * human-readable json string.
   */
  Json: { input: any; output: any; }
};

/** The result of the :activate_contract mutation */
export type ActivateContractResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contract>;
};

/** The result of the :complete_contract mutation */
export type CompleteContractResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contract>;
};

export type Contract = {
  createdBy?: Maybe<Person>;
  createdById?: Maybe<Scalars['ID']['output']>;
  endDate?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organisation: Organisation;
  organisationId: Scalars['ID']['output'];
  person: Person;
  personId: Scalars['ID']['output'];
  role: Scalars['String']['output'];
  startDate: Scalars['Date']['output'];
  status: Scalars['String']['output'];
};

export type ContractFilterCreatedById = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type ContractFilterEndDate = {
  eq?: InputMaybe<Scalars['Date']['input']>;
  greaterThan?: InputMaybe<Scalars['Date']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Date']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['Date']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  notEq?: InputMaybe<Scalars['Date']['input']>;
};

export type ContractFilterId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type ContractFilterInput = {
  and?: InputMaybe<Array<ContractFilterInput>>;
  createdBy?: InputMaybe<PersonFilterInput>;
  createdById?: InputMaybe<ContractFilterCreatedById>;
  endDate?: InputMaybe<ContractFilterEndDate>;
  id?: InputMaybe<ContractFilterId>;
  not?: InputMaybe<Array<ContractFilterInput>>;
  or?: InputMaybe<Array<ContractFilterInput>>;
  organisationId?: InputMaybe<ContractFilterOrganisationId>;
  person?: InputMaybe<PersonFilterInput>;
  personId?: InputMaybe<ContractFilterPersonId>;
  role?: InputMaybe<ContractFilterRole>;
  startDate?: InputMaybe<ContractFilterStartDate>;
  status?: InputMaybe<ContractFilterStatus>;
};

export type ContractFilterOrganisationId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type ContractFilterPersonId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type ContractFilterRole = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type ContractFilterStartDate = {
  eq?: InputMaybe<Scalars['Date']['input']>;
  greaterThan?: InputMaybe<Scalars['Date']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  in?: InputMaybe<Array<Scalars['Date']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['Date']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  notEq?: InputMaybe<Scalars['Date']['input']>;
};

export type ContractFilterStatus = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type ContractSortField =
  | 'CREATED_BY_ID'
  | 'END_DATE'
  | 'ID'
  | 'ORGANISATION_ID'
  | 'PERSON_ID'
  | 'ROLE'
  | 'START_DATE'
  | 'STATUS';

export type ContractSortInput = {
  field: ContractSortField;
  order?: InputMaybe<SortOrder>;
};

export type CreateContractByEmailInput = {
  createdById?: InputMaybe<Scalars['ID']['input']>;
  email: Scalars['String']['input'];
  endDate?: InputMaybe<Scalars['Date']['input']>;
  organisationId: Scalars['ID']['input'];
  role: Scalars['String']['input'];
  startDate: Scalars['Date']['input'];
};

/** The result of the :create_contract_by_email mutation */
export type CreateContractByEmailResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contract>;
};

export type CreateContractInput = {
  createdById?: InputMaybe<Scalars['ID']['input']>;
  endDate?: InputMaybe<Scalars['Date']['input']>;
  organisationId: Scalars['ID']['input'];
  personId: Scalars['ID']['input'];
  role: Scalars['String']['input'];
  startDate: Scalars['Date']['input'];
};

/** The result of the :create_contract mutation */
export type CreateContractResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contract>;
};

export type CreateOrganisationInput = {
  name: Scalars['String']['input'];
  profilePicture?: InputMaybe<Scalars['String']['input']>;
  slug: Scalars['String']['input'];
  themeSeedColor?: InputMaybe<Scalars['String']['input']>;
};

/** The result of the :create_organisation mutation */
export type CreateOrganisationResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Organisation>;
};

export type CreatePersonInput = {
  birthDate?: InputMaybe<Scalars['Date']['input']>;
  givenName?: InputMaybe<Scalars['String']['input']>;
  ndSurname?: InputMaybe<Scalars['String']['input']>;
  stSurname?: InputMaybe<Scalars['String']['input']>;
};

export type CreatePersonProfileInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  organisationId: Scalars['ID']['input'];
  personId: Scalars['ID']['input'];
  phone?: InputMaybe<Scalars['String']['input']>;
  postCode?: InputMaybe<Scalars['String']['input']>;
  profilePicture?: InputMaybe<Scalars['String']['input']>;
};

/** The result of the :create_person_profile mutation */
export type CreatePersonProfileResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<PersonProfile>;
};

/** The result of the :create_person mutation */
export type CreatePersonResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Person>;
};

/** A keyset page of :contract */
export type KeysetPageOfContract = {
  /** Total count on all pages */
  count?: Maybe<Scalars['Int']['output']>;
  /** The last keyset in the results */
  endKeyset?: Maybe<Scalars['String']['output']>;
  /** The records contained in the page */
  results?: Maybe<Array<Contract>>;
  /** The first keyset in the results */
  startKeyset?: Maybe<Scalars['String']['output']>;
};

/** A keyset page of :person_profile */
export type KeysetPageOfPersonProfile = {
  /** Total count on all pages */
  count?: Maybe<Scalars['Int']['output']>;
  /** The last keyset in the results */
  endKeyset?: Maybe<Scalars['String']['output']>;
  /** The records contained in the page */
  results?: Maybe<Array<PersonProfile>>;
  /** The first keyset in the results */
  startKeyset?: Maybe<Scalars['String']['output']>;
};

export type Membership = {
  createdBy?: Maybe<Person>;
  createdById?: Maybe<Scalars['ID']['output']>;
  endDate?: Maybe<Scalars['Date']['output']>;
  id: Scalars['ID']['output'];
  organisation: Organisation;
  organisationId: Scalars['ID']['output'];
  person: Person;
  personId: Scalars['ID']['output'];
  startDate: Scalars['Date']['output'];
  status: Scalars['String']['output'];
};

export type MembershipFilterCreatedById = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['ID']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type MembershipFilterEndDate = {
  eq?: InputMaybe<Scalars['Date']['input']>;
  greaterThan?: InputMaybe<Scalars['Date']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Date']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['Date']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  notEq?: InputMaybe<Scalars['Date']['input']>;
};

export type MembershipFilterId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type MembershipFilterInput = {
  and?: InputMaybe<Array<MembershipFilterInput>>;
  createdBy?: InputMaybe<PersonFilterInput>;
  createdById?: InputMaybe<MembershipFilterCreatedById>;
  endDate?: InputMaybe<MembershipFilterEndDate>;
  id?: InputMaybe<MembershipFilterId>;
  not?: InputMaybe<Array<MembershipFilterInput>>;
  or?: InputMaybe<Array<MembershipFilterInput>>;
  organisationId?: InputMaybe<MembershipFilterOrganisationId>;
  person?: InputMaybe<PersonFilterInput>;
  personId?: InputMaybe<MembershipFilterPersonId>;
  startDate?: InputMaybe<MembershipFilterStartDate>;
  status?: InputMaybe<MembershipFilterStatus>;
};

export type MembershipFilterOrganisationId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type MembershipFilterPersonId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type MembershipFilterStartDate = {
  eq?: InputMaybe<Scalars['Date']['input']>;
  greaterThan?: InputMaybe<Scalars['Date']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  in?: InputMaybe<Array<Scalars['Date']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['Date']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  notEq?: InputMaybe<Scalars['Date']['input']>;
};

export type MembershipFilterStatus = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<Scalars['String']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type MembershipSortField =
  | 'CREATED_BY_ID'
  | 'END_DATE'
  | 'ID'
  | 'ORGANISATION_ID'
  | 'PERSON_ID'
  | 'START_DATE'
  | 'STATUS';

export type MembershipSortInput = {
  field: MembershipSortField;
  order?: InputMaybe<SortOrder>;
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

export type Organisation = {
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  profilePicture?: Maybe<Scalars['String']['output']>;
  slug: Scalars['String']['output'];
  themeSeedColor?: Maybe<Scalars['String']['output']>;
};

/** The result of the :pause_contract mutation */
export type PauseContractResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contract>;
};

export type Person = {
  birthDate?: Maybe<Scalars['Date']['output']>;
  givenName?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  ndSurname?: Maybe<Scalars['String']['output']>;
  stSurname?: Maybe<Scalars['String']['output']>;
};

export type PersonFilterBirthDate = {
  eq?: InputMaybe<Scalars['Date']['input']>;
  greaterThan?: InputMaybe<Scalars['Date']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Date']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['Date']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['Date']['input']>;
  notEq?: InputMaybe<Scalars['Date']['input']>;
};

export type PersonFilterGivenName = {
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

export type PersonFilterId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type PersonFilterInput = {
  and?: InputMaybe<Array<PersonFilterInput>>;
  birthDate?: InputMaybe<PersonFilterBirthDate>;
  givenName?: InputMaybe<PersonFilterGivenName>;
  id?: InputMaybe<PersonFilterId>;
  ndSurname?: InputMaybe<PersonFilterNdSurname>;
  not?: InputMaybe<Array<PersonFilterInput>>;
  or?: InputMaybe<Array<PersonFilterInput>>;
  stSurname?: InputMaybe<PersonFilterStSurname>;
};

export type PersonFilterNdSurname = {
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

export type PersonFilterStSurname = {
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

export type PersonProfile = {
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  displayName?: Maybe<Scalars['String']['output']>;
  email?: Maybe<Scalars['String']['output']>;
  gender?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  organisation: Organisation;
  organisationId: Scalars['ID']['output'];
  person: Person;
  personId: Scalars['ID']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  postCode?: Maybe<Scalars['String']['output']>;
  profilePicture?: Maybe<Scalars['String']['output']>;
};

export type PersonProfileFilterCity = {
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

export type PersonProfileFilterCountry = {
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

export type PersonProfileFilterDisplayName = {
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

export type PersonProfileFilterEmail = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type PersonProfileFilterGender = {
  eq?: InputMaybe<Scalars['String']['input']>;
  greaterThan?: InputMaybe<Scalars['String']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['String']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['String']['input']>;
  notEq?: InputMaybe<Scalars['String']['input']>;
};

export type PersonProfileFilterId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type PersonProfileFilterInput = {
  and?: InputMaybe<Array<PersonProfileFilterInput>>;
  city?: InputMaybe<PersonProfileFilterCity>;
  country?: InputMaybe<PersonProfileFilterCountry>;
  displayName?: InputMaybe<PersonProfileFilterDisplayName>;
  email?: InputMaybe<PersonProfileFilterEmail>;
  gender?: InputMaybe<PersonProfileFilterGender>;
  id?: InputMaybe<PersonProfileFilterId>;
  not?: InputMaybe<Array<PersonProfileFilterInput>>;
  or?: InputMaybe<Array<PersonProfileFilterInput>>;
  organisationId?: InputMaybe<PersonProfileFilterOrganisationId>;
  person?: InputMaybe<PersonFilterInput>;
  personId?: InputMaybe<PersonProfileFilterPersonId>;
  phone?: InputMaybe<PersonProfileFilterPhone>;
  postCode?: InputMaybe<PersonProfileFilterPostCode>;
  profilePicture?: InputMaybe<PersonProfileFilterProfilePicture>;
};

export type PersonProfileFilterOrganisationId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type PersonProfileFilterPersonId = {
  eq?: InputMaybe<Scalars['ID']['input']>;
  greaterThan?: InputMaybe<Scalars['ID']['input']>;
  greaterThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  in?: InputMaybe<Array<Scalars['ID']['input']>>;
  isNil?: InputMaybe<Scalars['Boolean']['input']>;
  lessThan?: InputMaybe<Scalars['ID']['input']>;
  lessThanOrEqual?: InputMaybe<Scalars['ID']['input']>;
  notEq?: InputMaybe<Scalars['ID']['input']>;
};

export type PersonProfileFilterPhone = {
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

export type PersonProfileFilterPostCode = {
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

export type PersonProfileFilterProfilePicture = {
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

export type PersonProfileSortField =
  | 'CITY'
  | 'COUNTRY'
  | 'DISPLAY_NAME'
  | 'EMAIL'
  | 'GENDER'
  | 'ID'
  | 'ORGANISATION_ID'
  | 'PERSON_ID'
  | 'PHONE'
  | 'POST_CODE'
  | 'PROFILE_PICTURE';

export type PersonProfileSortInput = {
  field: PersonProfileSortField;
  order?: InputMaybe<SortOrder>;
};

/** The result of the :resume_contract mutation */
export type ResumeContractResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contract>;
};

export type RootMutationType = {
  activateContract: ActivateContractResult;
  completeContract: CompleteContractResult;
  /** Creates a contract for an existing person (for renewals). */
  createContract: CreateContractResult;
  /** Creates a contract by email. Finds or creates person, profile, and user. */
  createContractByEmail: CreateContractByEmailResult;
  /** Creates a new organisation. */
  createOrganisation: CreateOrganisationResult;
  /** Creates a Person with provided data. */
  createPerson: CreatePersonResult;
  /** Creates a profile for a person in an organisation. */
  createPersonProfile: CreatePersonProfileResult;
  pauseContract: PauseContractResult;
  resumeContract: ResumeContractResult;
  terminateContract: TerminateContractResult;
  /** Updates a Person's personal data. */
  updatePerson: UpdatePersonResult;
  /** Updates profile preferences. */
  updatePersonProfile: UpdatePersonProfileResult;
};


export type RootMutationTypeActivateContractArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeCompleteContractArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeCreateContractArgs = {
  input: CreateContractInput;
};


export type RootMutationTypeCreateContractByEmailArgs = {
  input: CreateContractByEmailInput;
};


export type RootMutationTypeCreateOrganisationArgs = {
  input: CreateOrganisationInput;
};


export type RootMutationTypeCreatePersonArgs = {
  input?: InputMaybe<CreatePersonInput>;
};


export type RootMutationTypeCreatePersonProfileArgs = {
  input: CreatePersonProfileInput;
};


export type RootMutationTypePauseContractArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeResumeContractArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeTerminateContractArgs = {
  id: Scalars['ID']['input'];
};


export type RootMutationTypeUpdatePersonArgs = {
  id: Scalars['ID']['input'];
  input?: InputMaybe<UpdatePersonInput>;
};


export type RootMutationTypeUpdatePersonProfileArgs = {
  id: Scalars['ID']['input'];
  input?: InputMaybe<UpdatePersonProfileInput>;
};

export type RootQueryType = {
  contract?: Maybe<Contract>;
  contracts?: Maybe<KeysetPageOfContract>;
  currentUser?: Maybe<User>;
  /** Lists customers for the authenticated user based on their role and organisation. */
  customerList: Array<Membership>;
  /** Get a single organisation by unique identifier (id, name, or slug). */
  organisation?: Maybe<Organisation>;
  /** Returns organisations the actor can access. */
  organisations: Array<Organisation>;
  person?: Maybe<Person>;
  personProfile?: Maybe<PersonProfile>;
  personProfiles?: Maybe<KeysetPageOfPersonProfile>;
  user?: Maybe<User>;
};


export type RootQueryTypeContractArgs = {
  filter?: InputMaybe<ContractFilterInput>;
};


export type RootQueryTypeContractsArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<ContractFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<Array<InputMaybe<ContractSortInput>>>;
};


export type RootQueryTypeCustomerListArgs = {
  filter?: InputMaybe<MembershipFilterInput>;
  organisationId: Scalars['ID']['input'];
  sort?: InputMaybe<Array<InputMaybe<MembershipSortInput>>>;
};


export type RootQueryTypeOrganisationArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  slug?: InputMaybe<Scalars['String']['input']>;
};


export type RootQueryTypePersonArgs = {
  filter?: InputMaybe<PersonFilterInput>;
};


export type RootQueryTypePersonProfileArgs = {
  filter?: InputMaybe<PersonProfileFilterInput>;
};


export type RootQueryTypePersonProfilesArgs = {
  after?: InputMaybe<Scalars['String']['input']>;
  before?: InputMaybe<Scalars['String']['input']>;
  filter?: InputMaybe<PersonProfileFilterInput>;
  first?: InputMaybe<Scalars['Int']['input']>;
  last?: InputMaybe<Scalars['Int']['input']>;
  sort?: InputMaybe<Array<InputMaybe<PersonProfileSortInput>>>;
};


export type RootQueryTypeUserArgs = {
  filter?: InputMaybe<UserFilterInput>;
};

export type SortOrder =
  | 'ASC'
  | 'ASC_NULLS_FIRST'
  | 'ASC_NULLS_LAST'
  | 'DESC'
  | 'DESC_NULLS_FIRST'
  | 'DESC_NULLS_LAST';

/** The result of the :terminate_contract mutation */
export type TerminateContractResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Contract>;
};

export type UpdatePersonInput = {
  birthDate?: InputMaybe<Scalars['Date']['input']>;
  givenName?: InputMaybe<Scalars['String']['input']>;
  ndSurname?: InputMaybe<Scalars['String']['input']>;
  stSurname?: InputMaybe<Scalars['String']['input']>;
};

export type UpdatePersonProfileInput = {
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  displayName?: InputMaybe<Scalars['String']['input']>;
  email?: InputMaybe<Scalars['String']['input']>;
  gender?: InputMaybe<Scalars['String']['input']>;
  notes?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  postCode?: InputMaybe<Scalars['String']['input']>;
  profilePicture?: InputMaybe<Scalars['String']['input']>;
};

/** The result of the :update_person_profile mutation */
export type UpdatePersonProfileResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<PersonProfile>;
};

/** The result of the :update_person mutation */
export type UpdatePersonResult = {
  /** Any errors generated, if the mutation failed */
  errors: Array<MutationError>;
  /** The successful result of the mutation */
  result?: Maybe<Person>;
};

export type User = {
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  person: Person;
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
  id?: InputMaybe<UserFilterId>;
  not?: InputMaybe<Array<UserFilterInput>>;
  or?: InputMaybe<Array<UserFilterInput>>;
  person?: InputMaybe<PersonFilterInput>;
};

export type CurrentUserQueryVariables = Exact<{ [key: string]: never; }>;


export type CurrentUserQuery = { currentUser?: { id: string, email: string, person: { id: string, givenName?: string | null, stSurname?: string | null, ndSurname?: string | null, birthDate?: any | null } } | null };

export type CustomerListQueryVariables = Exact<{
  organisationId: Scalars['ID']['input'];
}>;


export type CustomerListQuery = { customerList: Array<{ id: string, startDate: any, endDate?: any | null, status: string, person: { id: string, givenName?: string | null, stSurname?: string | null, ndSurname?: string | null } }> };

export type AccessibleOrganisationsQueryVariables = Exact<{ [key: string]: never; }>;


export type AccessibleOrganisationsQuery = { organisations: Array<{ id: string, name: string, slug: string, profilePicture?: string | null, themeSeedColor?: string | null }> };

export type CreateOrganisationMutationVariables = Exact<{
  input: CreateOrganisationInput;
}>;


export type CreateOrganisationMutation = { createOrganisation: { result?: { id: string, name: string, slug: string, profilePicture?: string | null, themeSeedColor?: string | null } | null, errors: Array<{ message?: string | null }> } };

export type UpdatePersonMutationVariables = Exact<{
  id: Scalars['ID']['input'];
  input: UpdatePersonInput;
}>;


export type UpdatePersonMutation = { updatePerson: { result?: { id: string, givenName?: string | null, stSurname?: string | null, ndSurname?: string | null, birthDate?: any | null } | null, errors: Array<{ message?: string | null }> } };


export const CurrentUserDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CurrentUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"currentUser"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"person"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"stSurname"}},{"kind":"Field","name":{"kind":"Name","value":"ndSurname"}},{"kind":"Field","name":{"kind":"Name","value":"birthDate"}}]}}]}}]}}]} as unknown as DocumentNode<CurrentUserQuery, CurrentUserQueryVariables>;
export const CustomerListDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CustomerList"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"organisationId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"customerList"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"organisationId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"organisationId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"startDate"}},{"kind":"Field","name":{"kind":"Name","value":"endDate"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"person"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"stSurname"}},{"kind":"Field","name":{"kind":"Name","value":"ndSurname"}}]}}]}}]}}]} as unknown as DocumentNode<CustomerListQuery, CustomerListQueryVariables>;
export const AccessibleOrganisationsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AccessibleOrganisations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"organisations"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"profilePicture"}},{"kind":"Field","name":{"kind":"Name","value":"themeSeedColor"}}]}}]}}]} as unknown as DocumentNode<AccessibleOrganisationsQuery, AccessibleOrganisationsQueryVariables>;
export const CreateOrganisationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateOrganisation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateOrganisationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createOrganisation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"result"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"profilePicture"}},{"kind":"Field","name":{"kind":"Name","value":"themeSeedColor"}}]}},{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<CreateOrganisationMutation, CreateOrganisationMutationVariables>;
export const UpdatePersonDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdatePerson"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdatePersonInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updatePerson"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}},{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"result"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"givenName"}},{"kind":"Field","name":{"kind":"Name","value":"stSurname"}},{"kind":"Field","name":{"kind":"Name","value":"ndSurname"}},{"kind":"Field","name":{"kind":"Name","value":"birthDate"}}]}},{"kind":"Field","name":{"kind":"Name","value":"errors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"message"}}]}}]}}]}}]} as unknown as DocumentNode<UpdatePersonMutation, UpdatePersonMutationVariables>;