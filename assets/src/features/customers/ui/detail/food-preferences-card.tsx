import { Utensils } from "lucide-react";
import { useState } from "react";

import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import { FoodPreferenceDetailDialog } from "@/features/customers/ui/detail/food-preference-detail-dialog";
import { FoodPreferencePill } from "@/features/customers/ui/detail/food-preference-pill";
import { FoodPreferenceRemoveDialog } from "@/features/customers/ui/detail/food-preference-remove-dialog";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import * as m from "@/paraglide/messages";
import { cn } from "@/shared/utils/utils";

interface FoodPreferencesCardProps {
  readonly history: FoodPreferenceHistoryItem[];
  readonly isLoading?: boolean;
  readonly compact?: boolean;
  readonly personId?: string;
  readonly organizationId?: string;
}

function labelOf(item: FoodPreferenceHistoryItem): string {
  return item.items?.trim() || item.codings[0]?.display?.trim() || item.codings[0]?.code || "";
}

interface ColumnProps {
  readonly label: string;
  readonly variant: "inclusion" | "exclusion";
  readonly entries: { item: FoodPreferenceHistoryItem; label: string }[];
  readonly emptyText: string;
  readonly canInteract: boolean;
  readonly onPillClick: (item: FoodPreferenceHistoryItem) => void;
  readonly className?: string;
}

function Column({
  label,
  variant,
  entries,
  emptyText,
  canInteract,
  onPillClick,
  className,
}: ColumnProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <p className="font-semibold text-foreground/70 text-sm uppercase tracking-widest">{label}</p>
      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">{emptyText}</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {entries.map(({ item, label: text }) => (
            <FoodPreferencePill
              key={item.id}
              variant={variant}
              onClick={canInteract ? () => onPillClick(item) : undefined}
            >
              {text}
            </FoodPreferencePill>
          ))}
        </div>
      )}
    </div>
  );
}

export function FoodPreferencesCard({
  history,
  isLoading,
  compact,
  personId,
  organizationId,
}: FoodPreferencesCardProps) {
  const [viewingItem, setViewingItem] = useState<FoodPreferenceHistoryItem | null>(null);
  const [removingItem, setRemovingItem] = useState<FoodPreferenceHistoryItem | null>(null);

  const canInteract = Boolean(personId && organizationId);
  const safePersonId = personId ?? "";
  const safeOrgId = organizationId ?? "";

  const included = history
    .filter((item) => item.type === "inclusion")
    .map((item) => ({ item, label: labelOf(item) }))
    .filter((entry) => entry.label);
  const excluded = history
    .filter((item) => item.type === "exclusion")
    .map((item) => ({ item, label: labelOf(item) }))
    .filter((entry) => entry.label);

  return (
    <>
      <TagsCardShell
        isLoading={isLoading}
        isEmpty={included.length === 0 && excluded.length === 0}
        emptyIcon={Utensils}
        emptyTitle={m.food_preferences_empty()}
        emptyDescription={m.food_preferences_empty_desc()}
        compact={compact}
        columns={2}
      >
        <Column
          label={m.food_preferences_includes_label()}
          variant="inclusion"
          entries={included}
          emptyText={m.food_preferences_none_included()}
          canInteract={canInteract}
          onPillClick={setViewingItem}
          className="pr-3"
        />
        <Column
          label={m.food_preferences_avoids_label()}
          variant="exclusion"
          entries={excluded}
          emptyText={m.food_preferences_none_avoided()}
          canInteract={canInteract}
          onPillClick={setViewingItem}
          className="pl-3"
        />
      </TagsCardShell>

      {canInteract ? (
        <>
          <FoodPreferenceDetailDialog
            item={viewingItem}
            open={viewingItem !== null}
            onOpenChange={(open) => {
              if (!open) {
                setViewingItem(null);
              }
            }}
            onRemoveClick={() => {
              setRemovingItem(viewingItem);
              setViewingItem(null);
            }}
          />

          {removingItem !== null ? (
            <FoodPreferenceRemoveDialog
              id={removingItem.id}
              name={labelOf(removingItem)}
              personId={safePersonId}
              organizationId={safeOrgId}
              open={removingItem !== null}
              onOpenChange={(open) => {
                if (!open) {
                  setRemovingItem(null);
                }
              }}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
