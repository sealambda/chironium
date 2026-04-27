---
description: "Design and implement a new FHIR-aligned Ash resource with GraphQL exposure, policies, migrations, and tests that match Chironium backend conventions."
name: "Create FHIR Ash Resource"
argument-hint: "Describe the resource, key fields, actors, and expected GraphQL operations."
agent: "agent"
---
Create or update backend code for the requested feature using Chironium conventions.

Inputs:
- Requested resource behavior and domain context.
- Required FHIR mapping or clinical semantics.
- Required GraphQL operations.
- Authorization expectations by actor type.

Execution requirements:
- Keep domain boundaries strongly encapsulated and place logic in the owning domain.
- Favor FHIR-compliant naming and datatypes.
- Reuse existing shared datatypes before introducing new structures.
- Add or update Ash resource actions, policies, relationships, and GraphQL blocks as needed.
- Keep custom resolver logic thin and place business behavior in Ash actions/checks/changes.
- Apply tenant-aware authorization patterns (SetTenant boundary + policy checks).
- Use modern PostgreSQL features appropriately (indexes, citext, trigram, vector) when justified by access patterns.
- If persistence shape changes, generate migration workflow guidance with mix ash.codegen --dev.
- Add or update tests covering allow and deny paths, actor resolution behavior, and tenant context.

Output format:
1. Summary of design decisions and FHIR mapping.
2. Concrete file changes made.
3. Migration implications and command(s) to run.
4. Test cases added or updated.
5. Follow-up risks or assumptions.
