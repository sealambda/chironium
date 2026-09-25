import { Utensils } from "lucide-react";
import { useState } from "react";

import type { FoodPreferenceHistoryItem } from "@/features/customers/api/food-preferences-api";
import { FoodPreferenceDetailDialog } from "@/features/customers/ui/detail/food-preference-detail-dialog";
import { FoodPreferencePill } from "@/features/customers/ui/detail/food-preference-pill";
import { FoodPreferenceRemoveDialog } from "@/features/customers/ui/detail/food-preference-remove-dialog";
import { SelfReportedBadge } from "@/features/customers/ui/detail/self-reported-badge";
import { TagsCardColumn, TagsCardPillList } from "@/features/customers/ui/detail/tags-card-content";
import { TagsCardShell } from "@/features/customers/ui/detail/tags-card-shell";
import * as m from "@/paraglide/messages";

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
  const selfReportedLabels = [...included, ...excluded]
    .filter(({ item }) => item.selfReported)
    .map(({ label }) => label);

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
        footer={
          selfReportedLabels.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-border border-t pt-3">
              <SelfReportedBadge />
              <span className="text-foreground/65 text-xs">{selfReportedLabels.join(", ")}</span>
            </div>
          ) : null
        }
      >
        <TagsCardColumn
          title={m.food_preferences_includes_label()}
          isEmpty={included.length === 0}
          emptyText={m.food_preferences_none_included()}
          className="pr-3"
        >
          <TagsCardPillList>
            {included.map(({ item, label }) => (
              <FoodPreferencePill
                key={item.id}
                variant="inclusion"
                onClick={canInteract ? () => setViewingItem(item) : undefined}
              >
                {label}
              </FoodPreferencePill>
            ))}
          </TagsCardPillList>
        </TagsCardColumn>
        <TagsCardColumn
          title={m.food_preferences_avoids_label()}
          isEmpty={excluded.length === 0}
          emptyText={m.food_preferences_none_avoided()}
          className="pl-3"
        >
          <TagsCardPillList>
            {excluded.map(({ item, label }) => (
              <FoodPreferencePill
                key={item.id}
                variant="exclusion"
                onClick={canInteract ? () => setViewingItem(item) : undefined}
              >
                {label}
              </FoodPreferencePill>
            ))}
          </TagsCardPillList>
        </TagsCardColumn>
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
