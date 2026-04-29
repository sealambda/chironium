import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import { FoodPreferencePill } from "@/features/customers/ui/detail/food-preference-pill";

interface FoodPreferenceEventProps {
  readonly preferences: readonly FoodPreferenceHistoryItem[];
}

export function FoodPreferenceEvent({ preferences }: FoodPreferenceEventProps) {
  const first = preferences[0];
  if (!first) {
    return null;
  }

  // Pre-computed display text from the normalizer. Coding display names can
  // be null when the server omits them, so deriving tags from items avoids
  // silent empty renders.
  const tags = preferences.flatMap((preference) =>
    preference.items
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean),
  );

  if (tags.length === 0) {
    return null;
  }

  const variant = first.type === "inclusion" ? "inclusion" : "exclusion";
  const seen = new Map<string, number>();

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const count = (seen.get(tag) ?? 0) + 1;
        seen.set(tag, count);
        return (
          <FoodPreferencePill key={`${tag}-${count}`} variant={variant}>
            {tag}
          </FoodPreferencePill>
        );
      })}
    </div>
  );
}
