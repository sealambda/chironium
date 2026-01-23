# Multitenancy & Data Distribution Analysis

## Overview

This document analyzes Chironium's data model alignment with Ash Framework multitenancy patterns and compatibility with distributed PostgreSQL systems like Citus.

## Current Architecture

### Multitenancy Strategy

Chironium uses **attribute-based multitenancy** with `organisation_id` as the tenant key:

```elixir
multitenancy do
  strategy :attribute
  attribute :organisation_id
  global? true
end
```

### Resource Classification

| Category           | Resources                                                                     | Tenant Scoped               |
| ------------------ | ----------------------------------------------------------------------------- | --------------------------- |
| **Multitenant**    | PersonProfile, Contract, Membership, Assignment                               | ✅ Yes                      |
| **Global**         | Organisation, Person, User, Token, UserIdentity, AuthEvent                    | ❌ No                       |
| **Reference Data** | PathologyCatalog, CycleSymptomCatalog                                         | ❌ No                       |
| **Health Records** | BiometricRecord, NutritionPlan, MenstrualCycle, Diagnosis, CycleSymptomRecord | ⚠️ Inherited via Assignment |
| **Global Health**  | HealthProfile                                                                 | ❌ No (belongs to Person)   |

---

## Ash Multitenancy Alignment

### ✅ Correctly Implemented Patterns

| Aspect                    | Implementation             | Ash Best Practice                      |
| ------------------------- | -------------------------- | -------------------------------------- |
| **Strategy**              | `:attribute`               | Supported (`:attribute` or `:context`) |
| **Tenant Key**            | `organisation_id` (UUID)   | Any attribute works                    |
| **Global Access**         | `global? true`             | Recommended for admin dashboards       |
| **Tenant Identities**     | Implicit via attribute     | Automatic for attribute strategy       |
| **Cross-tenant Entities** | Person, User, Organisation | Correct separation                     |

### Design Strengths

1. **Person as Global Entity**
   - One person can exist across multiple organisations.
   - Staff at Gym A, customer at Clinic B — same Person record.
   - Avoids data duplication.

2. **PersonProfile Per-Organisation**
   - Different contact info, display names per tenant.
   - Enables org-specific preferences.

3. **Health Records via Assignment**
   - Medical data tied to staff-customer relationships.
   - Proper authorization (staff sees only their assigned customers).
   - Clear audit trail.

---

## Citus Compatibility Analysis

### Distribution Strategies

Citus supports two primary sharding strategies:

#### 1. Row-Based Sharding (Distributed Tables)

Tables are distributed by a **distribution column** (typically `tenant_id` or `organisation_id`).

**Compatibility Matrix:**

| Table               | Distribution Key                 | Citus Ready              |
| ------------------- | -------------------------------- | ------------------------ |
| `person_profiles`   | `organisation_id`                | ✅ Excellent             |
| `contracts`         | `organisation_id`                | ✅ Excellent             |
| `memberships`       | `organisation_id`                | ✅ Excellent             |
| `assignments`       | `organisation_id`                | ✅ Excellent             |
| `biometric_records` | via `assignment.organisation_id` | ⚠️ Needs denormalization |
| `nutrition_plans`   | via `assignment.organisation_id` | ⚠️ Needs denormalization |
| `menstrual_cycles`  | via `assignment.organisation_id` | ⚠️ Needs denormalization |
| `diagnoses`         | via `assignment.organisation_id` | ⚠️ Needs denormalization |
| `organisations`     | N/A                              | ✅ Reference table       |
| `people`            | N/A                              | ✅ Reference table       |
| `users`             | N/A                              | ✅ Reference table       |

#### 2. Schema-Based Sharding

Citus supports one schema per tenant. Our attribute-based approach is simpler and equally effective for row-based distribution.

---

## Issues & Recommendations

### Issue 1: Health Records Missing Direct `organisation_id`

**Current State:**

Health records inherit tenancy through `Assignment`:

```elixir
# BiometricRecord
relationships do
  belongs_to :assignment, Chironium.Services.Assignment
end
```

**Problem:**

Distributed joins across shards are expensive. Queries like "get all biometric records for org X" become cross-shard operations without a direct distribution key.

**Recommendation:**

Add `organisation_id` directly to all health records:

```elixir
defmodule Chironium.Health.BiometricRecord do
  # ...

  multitenancy do
    strategy :attribute
    attribute :organisation_id
    global? true
  end

  relationships do
    belongs_to :organisation, Chironium.Core.Organisation do
      allow_nil? false
    end
  end
end
```

Auto-populate via change:

```elixir
create :create do
  change fn changeset, _ctx ->
    assignment_id = Ash.Changeset.get_attribute(changeset, :assignment_id)
    if assignment_id do
      case Ash.get(Chironium.Services.Assignment, assignment_id, authorize?: false) do
        {:ok, assignment} ->
          Ash.Changeset.change_attribute(changeset, :organisation_id, assignment.organisation_id)
        _ ->
          changeset
      end
    else
      changeset
    end
  end
end
```

### Issue 2: HealthProfile Global Scope

**Current State:**

`HealthProfile` belongs to `Person` (global), not to an organisation.

**Analysis:**

This is intentional — biological health data (blood type, biological sex) is inherent to the person, not org-specific.

**For Citus:**

- Configure as a **reference table** (replicated to all nodes).
- Appropriate for low-cardinality, slowly-changing data.
- If data volume grows significantly, consider org-scoping.

---

## Citus Configuration Strategy

### Table Distribution

```sql
-- Reference tables (replicated to all nodes)
SELECT create_reference_table('organisations');
SELECT create_reference_table('people');
SELECT create_reference_table('users');
SELECT create_reference_table('tokens');
SELECT create_reference_table('user_identities');
SELECT create_reference_table('auth_events');
SELECT create_reference_table('health_profiles');
SELECT create_reference_table('pathology_catalog');
SELECT create_reference_table('cycle_symptom_catalog');

-- Distributed tables (sharded by organisation_id)
SELECT create_distributed_table('person_profiles', 'organisation_id');
SELECT create_distributed_table('contracts', 'organisation_id');
SELECT create_distributed_table('memberships', 'organisation_id');
SELECT create_distributed_table('assignments', 'organisation_id');

-- Health records (colocated with assignments)
SELECT create_distributed_table('biometric_records', 'organisation_id', colocate_with => 'assignments');
SELECT create_distributed_table('nutrition_plans', 'organisation_id', colocate_with => 'assignments');
SELECT create_distributed_table('menstrual_cycles', 'organisation_id', colocate_with => 'assignments');
SELECT create_distributed_table('diagnoses', 'organisation_id', colocate_with => 'assignments');
SELECT create_distributed_table('cycle_symptom_records', 'organisation_id', colocate_with => 'assignments');
```

### Colocation Benefits

All tenant-scoped tables using the same distribution key (`organisation_id`) and colocation group enables:

- **Local joins** — No cross-shard data movement.
- **Transactional writes** — ACID guarantees within a tenant.
- **Efficient queries** — Single-shard execution for tenant-scoped queries.

---

## Migration Path

### Phase 1: Add `organisation_id` to Health Records

1. Add `organisation_id` attribute to all health resources.
2. Add `belongs_to :organisation` relationship.
3. Create migration to add column and populate from assignments.
4. Add multitenancy DSL block.
5. Update create actions to auto-populate.

### Phase 2: Citus Setup (When Needed)

1. Install Citus extension.
2. Configure reference tables.
3. Configure distributed tables with colocation.
4. Test query performance.
5. Monitor shard balance.

---

## Query Patterns

### Efficient (Single-Shard)

```elixir
# Tenant-scoped query — executes on single shard
Membership
|> Ash.Query.set_tenant(org_id)
|> Ash.Query.filter(status == :ACTIVE)
|> Ash.read!()
```

### Cross-Tenant (Use Sparingly)

```elixir
# Global query — requires scatter-gather across shards
Membership
|> Ash.Query.filter(status == :ACTIVE)
|> Ash.read!(authorize?: false)  # Requires global? true
```

---

## Summary

| Area             | Status             | Action Required               |
| ---------------- | ------------------ | ----------------------------- |
| Ash Multitenancy | ✅ Correct         | None                          |
| Distribution Key | ✅ Good            | None                          |
| Health Records   | ⚠️ Indirect tenant | Add `organisation_id`         |
| Global Tables    | ✅ Correct         | Configure as reference tables |
| Schema Strategy  | N/A                | Stick with attribute-based    |

### Readiness Score: 90%

The data model is well-designed for multi-tenant SaaS. The main action item before Citus adoption is denormalizing `organisation_id` into health records for efficient distributed queries.

---

## References

- [Ash Multitenancy Guide](https://hexdocs.pm/ash/multitenancy.html)
- [AshPostgres Schema-Based Multitenancy](https://hexdocs.pm/ash_postgres/schema-based-multitenancy.html)
- [Citus Documentation](https://docs.citusdata.com/)
- [Citus Multi-Tenant Apps](https://www.citusdata.com/use-cases/multi-tenant-apps/)
