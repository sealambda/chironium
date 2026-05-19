import {
  type AnthropometricSnapshot,
  CIRCUMFERENCE_KEYS,
} from "@/features/customers/api/anthropometry-api";
import { CIRCUMFERENCE_LABELS } from "@/features/customers/ui/detail/anthropometry-measurement-details";
import * as m from "@/paraglide/messages";
import { formatAnthropometryValue } from "@/shared/utils/measurement-utils";

interface AnthropometryEventProps {
  snapshot: AnthropometricSnapshot;
}

interface MeasurementBox {
  key: string;
  label: string;
  value: string;
}

function buildBoxes(snapshot: AnthropometricSnapshot): MeasurementBox[] {
  const boxes: MeasurementBox[] = [];

  if (snapshot.weight != null) {
    boxes.push({
      key: "weight",
      label: m.anthropometry_weight(),
      value: `${formatAnthropometryValue(snapshot.weight)} ${m.common_unit_kg()}`,
    });
  }
  if (snapshot.height != null) {
    boxes.push({
      key: "height",
      label: m.anthropometry_height(),
      value: `${formatAnthropometryValue(snapshot.height)} ${m.common_unit_cm()}`,
    });
  }
  if (snapshot.bmi != null) {
    boxes.push({
      key: "bmi",
      label: m.anthropometry_bmi(),
      value: formatAnthropometryValue(snapshot.bmi),
    });
  }
  for (const k of CIRCUMFERENCE_KEYS) {
    const val = snapshot[k];
    if (val != null) {
      boxes.push({
        key: k,
        label: CIRCUMFERENCE_LABELS[k](),
        value: `${formatAnthropometryValue(val)} ${m.common_unit_cm()}`,
      });
    }
  }
  if (snapshot.whr != null) {
    boxes.push({
      key: "whr",
      label: m.anthropometry_whr(),
      value: snapshot.whr.toFixed(2),
    });
  }

  return boxes;
}

export function AnthropometryEvent({ snapshot }: Readonly<AnthropometryEventProps>) {
  const boxes = buildBoxes(snapshot);

  if (boxes.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {boxes.map((box) => (
        <div key={box.key} className="rounded-xl border bg-card px-4 py-3 text-center">
          <p className="text-foreground/65 text-xs">{box.label}</p>
          <p className="mt-0.5 font-semibold text-foreground tabular-nums">
            {box.value}
          </p>
        </div>
      ))}
    </div>
  );
}
