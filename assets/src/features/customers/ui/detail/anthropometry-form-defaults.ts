import type { AnthropometricSnapshot } from "@/features/customers/api/anthropometry-api";
import type { AnthropometryFormValues } from "@/features/customers/ui/detail/anthropometry-form-fields";
import {
  buildAnthropometryMeasurementValues,
  hasAdvancedAnthropometryMeasurementValues,
} from "@/features/customers/ui/shared/anthropometry-measurement-fields";
import { toDateTimeInputParts } from "@/shared/utils/date-time-input";

export function buildAnthropometryFormDefaults(
  latestAnthropometry?: AnthropometricSnapshot | null,
  value: Date = new Date(),
): AnthropometryFormValues {
  const current = toDateTimeInputParts(value);

  return {
    effectiveDateTime: current.date,
    effectiveTime: current.time,
    ...buildAnthropometryMeasurementValues({
      weightKg: latestAnthropometry?.weight ?? null,
      heightCm: latestAnthropometry?.height ?? null,
      chestCm: latestAnthropometry?.chest ?? null,
      waistCm: latestAnthropometry?.waist ?? null,
      hipCm: latestAnthropometry?.hip ?? null,
      armCm: latestAnthropometry?.arm ?? null,
      thighCm: latestAnthropometry?.thigh ?? null,
    }),
  };
}

export function hasAdvancedAnthropometryValues(
  latestAnthropometry?: AnthropometricSnapshot | null,
): boolean {
  return hasAdvancedAnthropometryMeasurementValues({
    chestCm: latestAnthropometry?.chest ?? null,
    waistCm: latestAnthropometry?.waist ?? null,
    hipCm: latestAnthropometry?.hip ?? null,
    armCm: latestAnthropometry?.arm ?? null,
    thighCm: latestAnthropometry?.thigh ?? null,
  });
}
