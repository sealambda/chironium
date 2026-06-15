import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NutritionPlanDetailDialog } from "./nutrition-plan-detail-dialog";

const createNutritionPlan = vi.fn().mockResolvedValue(undefined);
const updateNutritionPlan = vi.fn().mockResolvedValue(undefined);

vi.mock("@/features/customers/api/nutrition-plans-api", () => ({
  createNutritionPlan: (...args: unknown[]) => createNutritionPlan(...args),
  updateNutritionPlan: (...args: unknown[]) => updateNutritionPlan(...args),
  removeNutritionPlan: vi.fn(),
}));

vi.mock("@/features/customers/utils/person-detail-cache", () => ({
  invalidatePersonDetail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/org/hooks/use-org", () => ({
  useOrg: () => ({ selectedOrg: { id: "org-1" } }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

function renderDialog(node: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{node}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("NutritionPlanDetailDialog", () => {
  it("submits the parsed macro/calorie targets when adding a plan", async () => {
    renderDialog(
      <NutritionPlanDetailDialog
        mode="add"
        personId="person-1"
        patientId="patient-1"
        organizationId=""
        open
        onOpenChange={() => {}}
      />,
    );

    // Four number inputs in DOM order: target kcal, protein, carbs, fat (grams default).
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs).toHaveLength(4);
    fireEvent.change(inputs[0] as HTMLInputElement, { target: { value: "2000" } });
    fireEvent.change(inputs[1] as HTMLInputElement, { target: { value: "150" } });
    fireEvent.change(inputs[2] as HTMLInputElement, { target: { value: "200" } });
    fireEvent.change(inputs[3] as HTMLInputElement, { target: { value: "67" } });

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(createNutritionPlan).toHaveBeenCalledTimes(1));
    expect(createNutritionPlan).toHaveBeenCalledWith(
      { targetKcal: 2000, proteinG: 150, carbsG: 200, fatG: 67 },
      "patient-1",
      "org-1",
    );
  });

  it("disables BMR suggestion without demographics and fills the target with them", async () => {
    const { rerender } = renderDialog(
      <NutritionPlanDetailDialog
        mode="add"
        personId="person-1"
        patientId="patient-1"
        organizationId=""
        open
        onOpenChange={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Suggest from BMR" })).toBeDisabled();

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <NutritionPlanDetailDialog
          mode="add"
          personId="person-1"
          patientId="patient-1"
          organizationId=""
          weightKg={80}
          heightCm={180}
          dateOfBirth="1990-01-01"
          sex="MALE"
          open
          onOpenChange={() => {}}
        />
      </QueryClientProvider>,
    );

    const bmrButton = screen.getByRole("button", { name: "Suggest from BMR" });
    expect(bmrButton).toBeEnabled();

    const targetInput = screen.getAllByRole("spinbutton")[0] as HTMLInputElement;
    expect(targetInput.value).toBe("");
    fireEvent.click(bmrButton);
    await waitFor(() => expect(Number(targetInput.value)).toBeGreaterThan(0));
  });
});
