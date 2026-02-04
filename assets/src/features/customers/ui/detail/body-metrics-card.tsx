import type { BodyMetricsRecord } from "@/mocks/types";
import { MetricCard } from "@/shared/ui/metric-card";

interface MetricRowProps {
  label: string;
  value: string | number | undefined;
  unit?: string;
}

function MetricRow({ label, value, unit }: Readonly<MetricRowProps>) {
  if (value === undefined) return null;
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {value}
        {unit && <span className="text-muted-foreground ml-0.5">{unit}</span>}
      </span>
    </div>
  );
}

interface BodyMetricsCardProps {
  metrics: BodyMetricsRecord | undefined;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Card displaying latest body metrics (weight, height, BMI, measurements).
 */
export function BodyMetricsCard({
  metrics,
  onClick,
  isLoading,
}: Readonly<BodyMetricsCardProps>) {
  if (isLoading) {
    return (
      <MetricCard title="Body Metrics" onClick={onClick}>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-16 rounded bg-muted" />
              <div className="h-4 w-12 rounded bg-muted" />
            </div>
          ))}
        </div>
      </MetricCard>
    );
  }

  if (!metrics) {
    return (
      <MetricCard title="Body Metrics" onClick={onClick}>
        <p className="text-muted-foreground text-sm">
          No measurements recorded
        </p>
      </MetricCard>
    );
  }

  const { measurements } = metrics;
  const heightCm = Math.round(metrics.heightM * 100);

  return (
    <MetricCard
      title="Body Metrics"
      lastUpdated={new Date(metrics.date)}
      onClick={onClick}
    >
      <div className="space-y-3">
        {/* Primary metrics */}
        <div className="space-y-1">
          <MetricRow label="Weight" value={metrics.weight} unit="kg" />
          <MetricRow label="Height" value={heightCm} unit="cm" />
          <MetricRow label="BMI" value={metrics.bmi.toFixed(1)} />
        </div>

        {/* Measurements */}
        {(measurements.waist ||
          measurements.hip ||
          measurements.chest ||
          measurements.bicepsLeft ||
          measurements.quadricepsLeft) && (
          <div className="border-t border-border pt-2">
            <p className="mb-1 font-medium text-muted-foreground text-xs uppercase tracking-wide">
              Measurements
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <MetricRow label="Waist" value={measurements.waist} unit="cm" />
              <MetricRow label="Hip" value={measurements.hip} unit="cm" />
              <MetricRow label="Chest" value={measurements.chest} unit="cm" />
              {(measurements.bicepsLeft || measurements.bicepsRight) && (
                <MetricRow
                  label="Biceps L/R"
                  value={
                    measurements.bicepsLeft && measurements.bicepsRight
                      ? `${measurements.bicepsLeft}/${measurements.bicepsRight}`
                      : measurements.bicepsLeft || measurements.bicepsRight
                  }
                  unit="cm"
                />
              )}
              {(measurements.quadricepsLeft ||
                measurements.quadricepsRight) && (
                <MetricRow
                  label="Quads L/R"
                  value={
                    measurements.quadricepsLeft && measurements.quadricepsRight
                      ? `${measurements.quadricepsLeft}/${measurements.quadricepsRight}`
                      : measurements.quadricepsLeft ||
                        measurements.quadricepsRight
                  }
                  unit="cm"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </MetricCard>
  );
}
