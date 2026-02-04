import type { Contact, Organization, User } from "@/gql/graphql";
import type {
  BodyMetricsRecord,
  CycleRecord,
  NutritionPlanRecord,
  PathologyRecord,
  SubscriptionHistoryRecord,
} from "@/mocks/types";
import { bodyMetrics } from "./data/body-metrics";
import { cycleHistory } from "./data/cycle-history";
import { nutritionPlans } from "./data/nutrition-plans";
import { organizations } from "./data/organizations";
import { pathologies } from "./data/pathologies";
import { type PlanSeed, plans } from "./data/plans";
import { subscriptionHistory } from "./data/subscription-history";
import { type SubscriptionSeed, subscriptions } from "./data/subscriptions";
import { users } from "./data/users";

const STORAGE_KEY = "msw-db";

// Database shape for persistence
type DbShape = {
  users: User[];
  organizations: Organization[];
  contacts: Contact[];
  plans: PlanSeed[];
  subscriptions: SubscriptionSeed[];
  subscriptionHistory: SubscriptionHistoryRecord[];
  bodyMetrics: BodyMetricsRecord[];
  nutritionPlans: NutritionPlanRecord[];
  cycleHistory: CycleRecord[];
  pathologies: PathologyRecord[];
};

// Seed data (immutable defaults)
const seedData: DbShape = {
  users: [...users],
  organizations: [...organizations],
  contacts: [],
  plans: [...plans],
  subscriptions: [...subscriptions],
  subscriptionHistory: [...subscriptionHistory],
  bodyMetrics: [...bodyMetrics],
  nutritionPlans: [...nutritionPlans],
  cycleHistory: [...cycleHistory],
  pathologies: [...pathologies],
};

// Load persisted data, merging with seed data
function loadDb(): DbShape {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...seedData };
    const persisted = JSON.parse(stored) as Partial<DbShape>;
    return {
      ...seedData,
      ...persisted,
    };
  } catch {
    return { ...seedData };
  }
}

// Save entire db to localStorage
function saveDb(data: DbShape): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage might be full or disabled
  }
}

// Mutating array methods that trigger persistence
const MUTATING_METHODS = [
  "push",
  "pop",
  "shift",
  "unshift",
  "splice",
  "sort",
  "reverse",
];

// Create a proxy that auto-persists on mutations
function createPersistentDb(): DbShape {
  const data = loadDb();

  // Wrap array to detect mutations and auto-save
  function wrapArray<T>(arr: T[]): T[] {
    return new Proxy(arr, {
      get(target, prop) {
        const value = Reflect.get(target, prop);
        if (
          typeof prop === "string" &&
          MUTATING_METHODS.includes(prop) &&
          typeof value === "function"
        ) {
          return (...args: unknown[]) => {
            const result = (value as (...a: unknown[]) => unknown).apply(
              target,
              args,
            );
            saveDb(data);
            return result;
          };
        }
        return value;
      },
      set(target, prop, value) {
        const result = Reflect.set(target, prop, value);
        saveDb(data);
        return result;
      },
    });
  }

  // Wrap each collection explicitly to preserve types
  return {
    users: wrapArray(data.users),
    organizations: wrapArray(data.organizations),
    contacts: wrapArray(data.contacts),
    plans: wrapArray(data.plans),
    subscriptions: wrapArray(data.subscriptions),
    subscriptionHistory: wrapArray(data.subscriptionHistory),
    bodyMetrics: wrapArray(data.bodyMetrics),
    nutritionPlans: wrapArray(data.nutritionPlans),
    cycleHistory: wrapArray(data.cycleHistory),
    pathologies: wrapArray(data.pathologies),
  };
}

/**
 * Mock database with automatic localStorage persistence.
 * All mutations (push, splice, etc.) are automatically saved.
 */
export const db = createPersistentDb();

/**
 * Reset database to seed data (clears localStorage).
 */
export function resetDb(): void {
  localStorage.removeItem(STORAGE_KEY);
  // Reload page to reinitialize with seed data
  window.location.reload();
}
