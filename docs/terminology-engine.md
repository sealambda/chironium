# Terminology Engine

## Goal

Make `Chironium.Terminology` the source of truth for FHIR-aligned terminology concepts inside Chironium without committing yet to literal FHIR REST endpoints. The design should support three immediate outcomes:

- shared global terminology storage for standard systems such as SNOMED CT, LOINC, and RxNorm;
- domain-level operations for validation, lookup, subsumption, expansion, and translation;
- incremental integration with existing health resources that already embed FHIR `Coding` and `CodeableConcept` snapshots.

## Current State

`Chironium.Terminology` already exists as a standalone Ash domain with five read-only resources exposed through GraphQL and Ash Admin:

- `CodeSystem`
- `Concept`
- `Designation`
- `ConceptClosure`
- `ConceptEmbedding`

These resources already live in the public schema, not tenant schemas. The repo also already installs both `pg_trgm` and `vector`, which means the database can support text search and vector search once the higher-level service API exists.

The important limitation is that the implementation is still only a storage layer. It does not yet expose FHIR-shaped terminology operations, and it does not yet model `ValueSet` or `ConceptMap`.

The code also has several concrete gaps that this document must acknowledge explicitly:

```elixir
# Current code does not match the design doc yet.
# Concept lacks :active.
# Designation lacks :use.
# Terminology exposes only read-only resources.
```

Additional gaps in the current implementation:

- `Concept` only stores `code`; it does not yet record whether the concept is active in the source release.
- `Designation` stores `language` and `value` only, so preferred displays, synonyms, abbreviations, and fully specified names cannot be distinguished.
- Closure traversal naming is ambiguous. A transitive closure row is better described as `ancestor` and `descendant` than `parent` and `child`.
- `CodeSystem` is still minimal metadata. It has canonical identity (`url`, `version`) but only limited compatibility metadata for future FHIR alignment.
- There is no explicit `GlobalResource` base macro yet in the original implementation, even though these resources are global by behavior.
- There are no terminology service actions such as `lookup`, `validate_code`, `subsumes`, `expand`, or `translate`.
- There are no `ValueSet` or `ConceptMap` resources yet.

## Target Architecture

The target model is FHIR-shaped at the domain and data-model level while remaining transport-agnostic. Chironium should align its terminology semantics with FHIR terminology service concepts even if the first API surface remains GraphQL and Elixir functions instead of FHIR REST endpoints.

### Core Global Resources

The global terminology model is centered on these resources:

| Resource | Purpose | Scope |
| --- | --- | --- |
| `CodeSystem` | Canonical metadata for a code system release. | Global, public schema |
| `Concept` | A code-system-specific concept identity. | Global, public schema |
| `Designation` | Language- and use-specific text for a concept. | Global, public schema |
| `ConceptClosure` | Precomputed ancestor/descendant hierarchy for subsumption queries. | Global, public schema |
| `ValueSet` | Reusable subsets of codes for validation and expansion. | Global first, tenant-local later |
| `ConceptMap` | Cross-system or local translations between concepts. | Global first, tenant-local later |
| `ConceptEmbedding` | Search infrastructure for semantic retrieval, not a FHIR resource. | App-specific optional global infrastructure |

`ConceptEmbedding` remains intentionally outside the FHIR resource set. It supports Chironium search features, but it should never become the primary representation of terminology meaning.

### `CodeSystem`

`CodeSystem` stays lightweight but should be compatible with future FHIR-style metadata. The current proportional target is:

- required identity: `url`, `name`;
- canonical versioning: optional `version`;
- optional compatibility metadata: `title`, `status`, `description`, `content`;
- relationship: `has_many :concepts`.

The `url` plus `version` pair remains the stable uniqueness boundary for an imported release.

### `Concept`

`Concept` represents a code within one code system version. It should contain:

- `code`;
- `active`;
- `belongs_to :code_system`;
- `has_many :designations`;
- `has_many :embeddings`;
- `has_many :ancestor_closures` for rows where the concept is the descendant;
- `has_many :descendant_closures` for rows where the concept is the ancestor.

This keeps concept identity separate from human-readable text and makes closure traversal naming reflect what the rows actually mean.

### `Designation`

`Designation` is the text layer for a concept. It should contain:

- `language`;
- `use`;
- `value`;
- `belongs_to :concept`.

The important modeling rule is that `value` alone is not enough. A terminology engine must distinguish between at least a preferred display, a fully specified term, and synonyms or abbreviations. A uniqueness strategy based on `(concept_id, language, use, value)` is sufficient for the current scope and keeps future display-resolution logic practical.

### `ConceptClosure`

`ConceptClosure` stores precomputed transitive hierarchy rows with:

- `depth`;
- `belongs_to :ancestor`;
- `belongs_to :descendant`.

This resource represents closure semantics, not direct-edge semantics. A row can describe either a direct relationship (`depth = 1`) or a transitive one (`depth > 1`), so `ancestor` and `descendant` are the correct terms.

### Deferred but Planned Resources

`ValueSet` and `ConceptMap` are not yet implemented, but the target architecture depends on them:

- `ValueSet` is required for reusable membership rules, expansion, and validation against a named code subset.
- `ConceptMap` is required for translation between source and target systems and for tenant-local equivalence tables.

## FHIR Compatibility Scope

FHIR compatibility in this document means compatibility of concepts, semantics, and domain operations. It does not yet mean a byte-for-byte FHIR server implementation.

### In Scope Now

- FHIR-shaped terminology resource concepts: `CodeSystem`, `ValueSet`, `ConceptMap`.
- FHIR-shaped terminology operations at the domain level: `lookup`, `validate_code`, `subsumes`, `expand`, `translate`.
- Canonical identifiers and version-aware resolution.
- Terminology-backed display resolution for embedded `Coding` and `CodeableConcept` values.

### Deferred

- Literal FHIR REST endpoints and full operation request/response envelopes.
- Full `ValueSet.compose.include.exclude` expressiveness on day one.
- Full `CodeSystem` supplements, properties, filters, and complete FHIR metadata parity.
- Full authoring workflows for terminology editing.
- Release-management features beyond what the existing Ash and migration tooling already provides.

## Tenant-Specific Terminology

Chironium already uses schema-based tenancy for tenant-owned resources. Terminology should keep that pattern instead of inventing a second tenancy mechanism.

### Global Terminology

Standard terminologies belong in `public`:

- `CodeSystem`
- `Concept`
- `Designation`
- `ConceptClosure`
- standard `ValueSet`
- standard `ConceptMap`
- optional `ConceptEmbedding`

These artifacts are shared reference data and should be ingested once for the whole system.

### Tenant-Local Terminology

Tenant-private terminology should use the existing schema-based tenancy pattern from `Chironium.BaseResources.Tenantable` when it is introduced for terminology artifacts that genuinely differ by organization.

The first tenant-local candidates are:

- custom `ValueSet` definitions;
- custom `ConceptMap` translations;
- later, custom local code systems if real product needs justify them.

Tenant-specific resolution should follow this precedence:

1. tenant-local artifact when the request names or resolves to one;
2. global canonical artifact in `public` as the fallback.

Existing health resources should continue to store embedded FHIR datatypes such as `Coding` and `CodeableConcept`. Terminology resources are for validation, resolution, search, and translation, not for replacing embedded code snapshots with foreign keys.

## Global Resource Convention

Terminology resources should use `Chironium.BaseResources.GlobalResource` to make their public-schema and non-tenant nature explicit in code. This macro exists to communicate intent and remove repeated boilerplate. It should stay separate from `Tenantable` and should not imply tenant resolution.

## Implementation Phases

### Phase 1: Stabilize the Existing Core

Bring the current storage model in line with the design before adding new artifacts:

- add `Concept.active`;
- add `Designation.use`;
- rename closure relationships to `ancestor` and `descendant` semantics;
- keep `CodeSystem` canonical/version metadata, plus proportional compatibility fields;
- introduce `GlobalResource` for explicit public-schema convention.

### Phase 2: Add Missing FHIR Artifacts

Add the first missing resource types:

- `ValueSet`;
- `ConceptMap`.

Both should be registered in `Chironium.Terminology` and backed by public-schema migrations first.

### Phase 3: Add a Terminology Service API

Expose domain-level operations aligned with FHIR terminology behavior:

- `lookup(system, code, version, language)`;
- `subsumes(system, code_a, code_b, version)`;
- `expand(value_set, filter, offset, count)`;
- `validate_code(value_set, system, code, display)`;
- `translate(source, concept_map_or_source_target)`.

These operations belong in the terminology domain and action modules, even if transport remains GraphQL.

### Phase 4: Add Tenant-Local Terminology

Introduce tenant-private `ValueSet` and `ConceptMap` artifacts using the existing tenancy pattern. Keep resolution deterministic by checking tenant-local resources before global canonical resources.

### Phase 5: Integrate Health Resources Incrementally

Move hardcoded terminology knowledge out of health resources step by step:

- route reusable validation through terminology actions;
- add shared localized display resolution;
- migrate the highest-value cases first, such as medicinal product validation and terminology-backed display lookup.

## Verification

The implementation is aligned with this design when all of the following are true:

- the document clearly distinguishes current state from target state;
- the core resource fields and relationship names match the code;
- public/global versus tenant-local terminology responsibilities are explicit;
- `ValueSet` and `ConceptMap` remain clearly identified as missing work rather than implied capabilities;
- the terminology domain can eventually answer representative `lookup`, `subsumes`, `expand`, `validate_code`, and `translate` use cases without changing existing embedded FHIR datatypes in health records.
