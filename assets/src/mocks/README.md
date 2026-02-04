# MSW Mock System

Mock Service Worker (MSW) implementation for frontend-first development.

## Quick Start

```bash
# Enable MSW
VITE_ENABLE_MSW=true pnpm dev

# Disable MSW (use real backend)
pnpm dev
```

## Architecture

```sh
mocks/
├── browser.ts       # MSW worker setup
├── handlers.ts      # Aggregates all handlers
├── db.ts            # Aggregates all data
│
├── data/            # Seed data by entity
│   ├── users.ts
│   ├── organizations.ts
│   └── ...
│
├── types/           # TEMPORARY entity types (until backend implements)
│   ├── index.ts
│   ├── body-metrics.ts
│   └── ...
│
├── graphql/         # TEMPORARY GraphQL definitions (until codegen available)
│   ├── index.ts
│   ├── documents/   # Reusable query/mutation strings
│   │   ├── subscription-list.ts
│   │   └── ...
│   └── types/       # Input/output types for GraphQL operations
│       ├── subscription.ts
│       └── ...
│
└── handlers/        # GraphQL handlers by domain
    ├── utils.ts     # Shared utilities (gql link, extractOrgId)
    ├── user.ts
    ├── organization.ts
    └── ...
```

### Directory Purposes

| Directory            | Contains                        | Used By               | Example                                    |
| -------------------- | ------------------------------- | --------------------- | ------------------------------------------ |
| `types/`             | Entity/record types             | API layer, handlers   | `BodyMetricsRecord`, `CycleRecord`         |
| `graphql/types/`     | GraphQL input/output types      | API layer, handlers   | `CreateSubscriptionInput`, `Subscription`  |
| `graphql/documents/` | Reusable query/mutation strings | API layer             | `SubscriptionListQuery`                    |

## Adding a New Mocked Feature

### 1. Create temporary types (if backend hasn't implemented yet)

For **entity types** (data records):

```typescript
// mocks/types/my-feature.ts
// TEMPORARY: Remove when backend implements my-feature

export interface MyFeatureRecord {
  id: string;
  customerId: string;
  // ...
}
```

For **GraphQL input/output types** (mutations, complex queries):

```typescript
// mocks/graphql/types/my-feature.ts
// TEMPORARY: Remove when backend implements my-feature

export interface CreateMyFeatureInput {
  name: string;
  // ...
}

export interface CreateMyFeatureResult {
  result: { id: string } | null;
  errors: Array<{ message: string }>;
}
```

Export from the respective index files.

### 2. Add seed data

```typescript
// mocks/data/my-feature.ts
import type { MyFeatureRecord } from "@/mocks/types";

export const myFeatureData: MyFeatureRecord[] = [
  { id: "mf-1", customerId: "contact-sara", ... },
];
```

### 3. Add to db.ts

```typescript
// mocks/db.ts
import { myFeatureData } from "./data/my-feature";

export const db = {
  // ...existing
  myFeature: [...myFeatureData] as MyFeatureRecord[],
};
```

### 4. Create handler

```typescript
// mocks/handlers/my-feature.ts
import { HttpResponse } from "msw";
import { db } from "../db";
import { extractOrgId, gql } from "./utils";

export const myFeatureHandlers = [
  gql.query("MyFeatureList", ({ request, variables }) => {
    const orgId = extractOrgId(request);
    const customerId = variables?.customerId as string | undefined;
    const results = customerId
      ? db.myFeature.filter((r) => r.customerId === customerId)
      : [];
    return HttpResponse.json({
      data: { myFeatureList: { results } },
    });
  }),
];
```

### 5. Add to handlers.ts

```typescript
// mocks/handlers.ts
import { myFeatureHandlers } from "./handlers/my-feature";

export const handlers = [
  // ...existing
  ...myFeatureHandlers,
];
```

### 6. Create API layer (optional - for reusable queries)

Queries can be defined inline in the API file or exported from `graphql/documents/`:

```typescript
// mocks/graphql/documents/my-feature-list.ts
// TEMPORARY: Remove when backend implements listMyFeature query

export const MyFeatureListQuery = `
  query MyFeatureList($customerId: String!) {
    myFeatureList(customerId: $customerId) {
      results {
        id
        customerId
        ...
      }
    }
  }
`;
```

## Migrating to Real Backend

When the backend implements the feature:

1. Run `pnpm codegen` to generate new types
2. Update API file imports: `@/mocks/types` → `@/gql/graphql`
3. Update API function to use codegen query
4. Delete from mocks:
   - `mocks/types/my-feature.ts`
   - `mocks/graphql/types/my-feature.ts` (if created)
   - `mocks/graphql/documents/my-feature-list.ts` (if created)
   - `mocks/data/my-feature.ts`
   - `mocks/handlers/my-feature.ts`
   - Remove from `db.ts` and `handlers.ts`

## Persistence

The mock database automatically persists all data to `localStorage` (key: `msw-db`).

- **Auto-save**: Any mutation (`push`, `splice`, etc.) automatically saves to localStorage
- **Auto-load**: On page refresh, data is restored from localStorage
- **Reset**: Call `resetDb()` from the console or use DevTools to clear localStorage

```typescript
// To reset mock data to seed values (from browser console):
import { resetDb } from "@/mocks/db";
resetDb(); // Clears localStorage and reloads page
```

## Boundaries

- **Components** → Import from `@/features/*/api` (never from `@/mocks`)
- **API layer** → Types from `@/gql/graphql` OR `@/mocks/types` OR `@/mocks/graphql` (temporary)
- **MSW handlers** → Use `@/mocks/db` and `@/mocks/graphql` directly

The API layer is the abstraction boundary. Components don't know if data comes from MSW or real backend.
