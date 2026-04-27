---
description: "Use when writing or updating Elixir tests for Ash resources, policy checks, actor resolution, and tenant-scoped behavior."
applyTo: "test/**/*.exs, test/support/**/*.ex"
---
# Backend Testing Patterns

- Build tenant-scoped tests around a realistic setup baseline:
  - create owner user.
  - create organization.
  - derive tenant as org_<organization_id>.
- Use Chironium.DataCase for data tests and keep sandbox setup intact.
- Prefer Chironium.Generator helpers for fixtures and randomized valid data.
- Keep actor-path coverage explicit:
  - owner/power user.
  - member with principal grant.
  - member without grant.
  - nil actor where relevant.
- Assert both positive and negative authorization outcomes.
- For denied writes, assert Ash.Error.Forbidden.
- Exercise ActorResolver-driven behavior in tests that represent request-time authorization reality.
- Pass tenant and actor explicitly on Ash reads/writes unless the test intentionally verifies missing context behavior.
- Use helper constructors at the bottom of the test module for readability and consistent fixture semantics.
- For visibility tests, assert exact visible ID sets where possible instead of only count-based assertions.
- Cover active/inactive lifecycle state behavior for care teams, grants, and archived entities.
- Add regression tests for version-loading behavior when paper trail actor fields are used.
