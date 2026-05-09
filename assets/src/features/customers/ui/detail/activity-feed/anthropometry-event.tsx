import type {
  AnthropometricSnapshot,
  CircumferenceKey,
} from "@/features/customers/api/anthropometry-api";
import { AnthropometryMeasurementDetails } from "@/features/customers/ui/detail/anthropometry-measurement-details";
import * as m from "@/paraglide/messages";
import { formatAnthropometryValue } from "@/shared/utils/measurement-utils";

const CIRCUMFERENCE_KEYS: CircumferenceKey[] = ["chest", "waist", "hip", "arm", "thigh"];

interface AnthropometryEventProps {
  snapshot: AnthropometricSnapshot;
}

// Simplified hero — no delta or date line (those live in the clinical summary card).
function HeroRow({ snapshot }: Readonly<{ snapshot: AnthropometricSnapshot }>) {
  if (snapshot.weight == null && snapshot.height == null) {
    return null;
  }

  return (
    <div className="space-y-0.5">
      {snapshot.weight == null ? null : (
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-2xl text-foreground tabular-nums">
            {formatAnthropometryValue(snapshot.weight)}
          </span>
          <span className="text-foreground/65 text-sm">{m.common_unit_kg()}</span>
        </div>
      )}
      {snapshot.height == null ? null : (
        <div className="text-foreground/65 text-sm">
          <span className="font-medium text-foreground tabular-nums">
            {formatAnthropometryValue(snapshot.height)}
          </span>{" "}
          {m.common_unit_cm()}
        </div>
      )}
    </div>
  );
}

export function AnthropometryEvent({ snapshot }: Readonly<AnthropometryEventProps>) {
  const hasAny =
    snapshot.weight != null ||
    snapshot.height != null ||
    snapshot.bmi != null ||
    CIRCUMFERENCE_KEYS.some((k) => snapshot[k] != null);

  if (!hasAny) {
    return null;
  }

  const hasHero = snapshot.weight != null || snapshot.height != null;

  return (
    <div className="w-full max-w-md rounded-xl border bg-card p-4 lg:max-w-lg">
      <HeroRow snapshot={snapshot} />
      {hasHero ? <div className="my-4 h-px bg-border" /> : null}
      <AnthropometryMeasurementDetails latest={snapshot} />
    </div>
  );
}
