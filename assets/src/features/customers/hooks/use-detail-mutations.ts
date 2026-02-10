import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useOrg } from "@/features/org/hooks/use-org";
import { db } from "@/mocks/db";
import type {
  BodyMetricsRecord,
  CycleRecord,
  NutritionPlanRecord,
  PathologyRecord,
  SubscriptionHistoryRecord,
} from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { parsePlanDurationMonths } from "@/shared/utils/duration-utils";

import type {
  BodyMetricsFormData,
  CycleFormData,
  NutritionPlanFormData,
  PathologyFormData,
  SubscriptionFormData,
} from "../model/detail-schemas";

let idCounter = Date.now();
function nextId(prefix: string) {
  return `${prefix}-${++idCounter}`;
}

function formatIso(date: Date): string {
  return date.toISOString().split("T")[0];
}

// ─── Hooks ──────────────────────────────────────────────────────────

export function useCreateBodyMetrics(customerId: string) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BodyMetricsFormData) => {
      const record: BodyMetricsRecord = {
        id: nextId("bm"),
        customerId,
        date: formatIso(data.date),
        weight: data.weight,
        heightM: data.heightCm / 100,
        bmi: data.weight / (data.heightCm / 100) ** 2,
        measurements: {
          chest: data.chest,
          waist: data.waist,
          hip: data.hip,
          biceps: data.biceps,
          quadriceps: data.quadriceps,
        },
      };
      db.bodyMetrics.unshift(record);
      return record;
    },
    onSuccess: () => {
      toast.success(m.toast_record_created());
      queryClient.invalidateQueries({
        queryKey: ["customer", customerId, "bodyMetrics", selectedOrg?.id],
      });
    },
  });
}

export function useCreateNutritionPlan(customerId: string) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: NutritionPlanFormData) => {
      const record: NutritionPlanRecord = {
        id: nextId("np"),
        customerId,
        startDate: formatIso(data.startDate),
        endDate: data.endDate ? formatIso(data.endDate) : undefined,
        kcal: data.kcal,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
      };
      db.nutritionPlans.unshift(record);
      return record;
    },
    onSuccess: () => {
      toast.success(m.toast_record_created());
      queryClient.invalidateQueries({
        queryKey: ["customer", customerId, "nutritionPlans", selectedOrg?.id],
      });
    },
  });
}

export function useCreateSubscription(customerId: string) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubscriptionFormData) => {
      const plan = db.plans.find((p) => p.id === data.planId);
      const durationMonths = parsePlanDurationMonths(plan?.periodDuration);
      const endDate = new Date(data.startDate);
      endDate.setMonth(endDate.getMonth() + durationMonths);

      const record: SubscriptionHistoryRecord = {
        id: nextId("sub"),
        customerId,
        startDate: formatIso(data.startDate),
        endDate: formatIso(endDate),
        planDurationMonths: durationMonths,
        status: "active",
      };
      db.subscriptionHistory.unshift(record);
      return record;
    },
    onSuccess: () => {
      toast.success(m.toast_record_created());
      queryClient.invalidateQueries({
        queryKey: ["customer", customerId, "subscriptionHistory", selectedOrg?.id],
      });
    },
  });
}

export function useCreatePathology(customerId: string) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: PathologyFormData) => {
      const isResolved = Boolean(data.resolvedDate || data.resolvedDateUnknown);
      const status = isResolved ? "resolved" : data.isChronic ? "chronic" : "active";

      const record: PathologyRecord = {
        id: nextId("path"),
        customerId,
        pathologyId: data.pathologyId,
        pathologyName: data.pathologyName,
        status,
        diagnosedDate: data.diagnosedDate ? formatIso(data.diagnosedDate) : undefined,
        resolvedDate: data.resolvedDate ? formatIso(data.resolvedDate) : undefined,
        diagnosedDateUnknown: data.diagnosedDateUnknown || undefined,
        resolvedDateUnknown: data.resolvedDateUnknown || undefined,
        notes: data.notes || undefined,
      };
      db.pathologies.unshift(record);
      return record;
    },
    onSuccess: () => {
      toast.success(m.toast_record_created());
      queryClient.invalidateQueries({
        queryKey: ["customer", customerId, "pathologies", selectedOrg?.id],
      });
    },
  });
}

export function usePauseSubscription(customerId: string) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const record = db.subscriptionHistory.find((r) => r.id === subscriptionId);
      if (!record) {
        throw new Error("Subscription not found");
      }
      record.status = record.status === "paused" ? "active" : "paused";
      return record;
    },
    onSuccess: (record) => {
      toast.success(
        record.status === "paused" ? m.toast_subscription_paused() : m.toast_subscription_resumed(),
      );
      queryClient.invalidateQueries({
        queryKey: ["customer", customerId, "subscriptionHistory", selectedOrg?.id],
      });
    },
  });
}

export function useCancelSubscription(customerId: string) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      const record = db.subscriptionHistory.find((r) => r.id === subscriptionId);
      if (!record) {
        throw new Error("Subscription not found");
      }
      record.status = "cancelled";
      return record;
    },
    onSuccess: () => {
      toast.success(m.toast_subscription_cancelled());
      queryClient.invalidateQueries({
        queryKey: ["customer", customerId, "subscriptionHistory", selectedOrg?.id],
      });
    },
  });
}

export function useCreateCycle(customerId: string) {
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CycleFormData) => {
      const record: CycleRecord = {
        id: nextId("cyc"),
        customerId,
        startDate: formatIso(data.startDate),
        endDate: data.endDate ? formatIso(data.endDate) : undefined,
        cycleLength: data.cycleLength,
        symptoms: data.symptoms,
      };
      db.cycleHistory.unshift(record);
      return record;
    },
    onSuccess: () => {
      toast.success(m.toast_record_created());
      queryClient.invalidateQueries({
        queryKey: ["customer", customerId, "cycleHistory", selectedOrg?.id],
      });
    },
  });
}
