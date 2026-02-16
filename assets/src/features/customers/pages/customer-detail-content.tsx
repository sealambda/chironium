import type { useCustomerDetail } from "../hooks/use-customer-detail";
import type { Customer } from "../ui/customer-card";
import { BiometricSummaryCard } from "../ui/detail/biometric-summary-card";
import { CustomerProfileCard } from "../ui/detail/customer-profile-card";
import { NutritionPlanSummaryCard } from "../ui/detail/nutrition-plan-summary-card";
import { SubscriptionCard } from "../ui/detail/subscription-card";

interface CustomerDetailContentProps {
  customer: Customer;
  detail: ReturnType<typeof useCustomerDetail>;
}

export function CustomerDetailContent({ customer, detail }: Readonly<CustomerDetailContentProps>) {
  const { currentSubscription, activeNutritionPlan, subscriptions, bodyMetrics, nutritionPlans } =
    detail;

  return (
    <div className="space-y-4 lg:space-y-6">
      <CustomerProfileCard customer={customer} />

      <SubscriptionCard subscription={currentSubscription} isLoading={subscriptions.isLoading} />

      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0">
        <BiometricSummaryCard history={bodyMetrics.data ?? []} isLoading={bodyMetrics.isLoading} />
        <NutritionPlanSummaryCard plan={activeNutritionPlan} isLoading={nutritionPlans.isLoading} />
      </div>
    </div>
  );
}
