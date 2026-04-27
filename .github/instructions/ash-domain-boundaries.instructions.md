---
description: "Use when creating or modifying Ash domains/resources, moving responsibilities across contexts, or designing new backend modules. Covers strong domain encapsulation and resource composition patterns."
applyTo: "lib/chironium/**/*.ex, lib/chironium_web/graphql_schema.ex"
---
# Ash Domain Boundaries and Encapsulation

- Keep each domain cohesive and independently evolvable. Place resources, checks, validations, preparations, calculations, and changes inside their owning domain folder.
- Treat domain modules as future extraction seams. Avoid leaking direct cross-domain implementation details.
- Use domain modules as the public boundary. Register resources in the matching domain module and expose only required domain-level APIs.
- Prefer domain-specific change/check modules over inline complex logic when logic is reused or non-trivial.
- Keep resource modules organized in a consistent block order: moduledoc, use, postgres, graphql, paper_trail, actions, policies, changes, validations, attributes, relationships.
- Use base resource macros to enforce consistency:
  - Tenant-scoped business entities use Chironium.BaseResources.Tenantable.
  - Shared public-schema entities use Chironium.BaseResources.Identifiable or Auditable as appropriate.
- Keep domain extensions aligned with current conventions:
  - Domains: AshGraphql.Domain, AshAdmin.Domain, AshPaperTrail.Domain.
  - Resources: AshGraphql.Resource, AshPaperTrail.Resource, AshArchival.Resource, and AshAdmin.Resource only where truly needed.
- Prefer explicit action definitions for domain behavior over generic create/update overloads when business meaning matters.
- Keep authorization concerns in policies/checks, not in ad hoc query branches scattered across actions.
- When introducing a new domain, wire it in all required boundaries: domain module resources list, GraphQL schema domain list, and any tenant/auth integration points.
- Preserve tenant-aware behavior by default for healthcare/business records. Do not create public-schema resources for tenant-specific data.
- Add concise @moduledoc text with a one-line purpose and domain context.
