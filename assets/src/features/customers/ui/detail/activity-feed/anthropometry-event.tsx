import type {
  AnthropometricSnapshot,
  CircumferenceKey,
} from "@/features/customers/api/anthropometry-api";
import { AnthropometryMeasurementDetails } from "@/features/customers/ui/detail/anthropometry-measurement-details";
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
      {snapshot.weight != null ? (
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-2xl text-foreground tabular-nums">
            {formatAnthropometryValue(snapshot.weight)}
          </span>
          <span className="text-foreground/65 text-sm">kg</span>
        </div>
      ) : null}
      {snapshot.height != null ? (
        <div className="text-foreground/65 text-sm">
          <span className="font-medium text-foreground tabular-nums">
            {formatAnthropometryValue(snapshot.height)}
          </span>{" "}
          cm
        </div>
      ) : null}
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
    <div className="max-w-52 rounded-xl border bg-card p-4">
      <HeroRow snapshot={snapshot} />
      {hasHero ? <div className="my-4 h-px bg-border" /> : null}
      <AnthropometryMeasurementDetails latest={snapshot} />
    </div>
  );
}
