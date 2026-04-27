---
description: "Use when implementing organization access checks, tenant resolution, actor resolution, or Ash policies for tenant-scoped resources."
applyTo: "lib/chironium/accounts/**/*.ex, lib/chironium/health/checks/**/*.ex, lib/chironium/**/checks/**/*.ex, lib/chironium_web/plugs/**/*.ex, lib/chironium/**/*.ex"
---
# Authorization and Multitenancy Strategy

- Enforce organization entry at the HTTP boundary first, then enforce resource access in Ash policies.
- Use tenant format org_<organization_id> and parse/validate it centrally.
- Keep access-level resolution centralized in Accounts.Authorization (power user vs member vs denied).
- Use SetTenant plug as the canonical place to:
  - Resolve tenant.
  - Validate organization access.
  - Set Ash tenant/context.
  - Resolve domain actor through ActorResolver.
- Preserve actor model semantics:
  - Power users keep User actor.
  - Members can resolve to domain principals through active grants.
  - Missing grants fall back to User and are denied by policies.
- Use policy structure consistently:
  - bypass for power users.
  - explicit policy blocks per action/action_type for remaining actors.
- Prefer reusable check modules for visibility logic instead of duplicating filter rules in each resource.
- Keep tenant-scoped resources policy-driven. Do not duplicate organization membership checks inside every action.
- Use authorize?: false only for trusted internal flows, setup/bootstrap paths, and tightly scoped test data creation.
- Ensure visibility checks account for active/inactive states where clinically relevant (for example active care teams and participants).
