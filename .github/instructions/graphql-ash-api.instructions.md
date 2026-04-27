---
description: "Use when exposing Ash resources through GraphQL, adding queries/mutations, or implementing API actions for the backend. Covers GraphQL naming and boundary patterns."
applyTo: "lib/chironium/**/*.ex, lib/chironium_web/graphql_schema.ex"
---
# GraphQL and Ash API Patterns

- Prefer AshGraphql-generated fields from resource and domain definitions. Add custom Absinthe resolvers only when generation cannot express the behavior.
- Keep GraphQL naming consistent:
  - create_<resource>, update_<resource>, delete_<resource>.
  - list_<resource_plural>, get_<resource>.
- For domain-specific workflows, create explicit Ash actions and expose them as explicit GraphQL mutations (for example log_body_weight).
- Keep resolvers thin and orchestration-focused. Business logic belongs in Ash actions, checks, calculations, validations, or changes.
- Use keyset pagination for list/read actions by default, and keep list query behavior deterministic.
- Keep GraphQL input objects stable and explicit for structured types (for example money, principal grants).
- Use actor and tenant from GraphQL context and keep authorization behavior aligned with resource policies.
- Avoid bypassing policies from GraphQL entry points unless an internal system action explicitly requires it.
- When adding a new domain resource, ensure it is reachable through both the domain definition and GraphQL schema domain list.
- Keep public? exposure deliberate for attributes and relationships to avoid accidental schema leaks.
