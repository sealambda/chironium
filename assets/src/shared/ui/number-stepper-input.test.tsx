import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { NumberStepperInput } from "./number-stepper-input";

interface TestNumberStepperProps {
  readonly initialValue?: string;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  readonly clearValueOnMin?: boolean;
}

function TestNumberStepper({
  initialValue = "",
  min = 0,
  max,
  step = 0.5,
  clearValueOnMin = false,
}: TestNumberStepperProps) {
  const [value, setValue] = useState(initialValue);

  return (
    <NumberStepperInput
      aria-label="Weight"
      value={value}
      onValueChange={setValue}
      min={min}
      max={max}
      step={step}
      clearValueOnMin={clearValueOnMin}
      decrementLabel="Decrease weight"
      incrementLabel="Increase weight"
    />
  );
}

describe("NumberStepperInput", () => {
  afterEach(() => {
    cleanup();
  });

  it("increments and decrements by the configured step", async () => {
    const user = userEvent.setup();
    render(<TestNumberStepper />);

    const input = screen.getByLabelText("Weight") as HTMLInputElement;
    await user.click(screen.getByRole("button", { name: "Increase weight" }));
    expect(input.value).toBe("0.5");

    await user.click(screen.getByRole("button", { name: "Increase weight" }));
    expect(input.value).toBe("1");

    await user.click(screen.getByRole("button", { name: "Decrease weight" }));
    expect(input.value).toBe("0.5");
  });

  it("clears the value when decrementing to the minimum when configured", async () => {
    const user = userEvent.setup();
    render(<TestNumberStepper initialValue="0.5" clearValueOnMin />);

    const input = screen.getByLabelText("Weight") as HTMLInputElement;
    await user.click(screen.getByRole("button", { name: "Decrease weight" }));

    expect(input.value).toBe("");
  });

  it("preserves fractional precision already present in the input", async () => {
    const user = userEvent.setup();
    render(<TestNumberStepper initialValue="31.25" />);

    const input = screen.getByLabelText("Weight") as HTMLInputElement;
    await user.click(screen.getByRole("button", { name: "Increase weight" }));

    expect(input.value).toBe("31.75");
  });

  it("disables controls at the configured bounds", () => {
    render(<TestNumberStepper initialValue="1" max={1} />);

    expect(screen.getByRole("button", { name: "Increase weight" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease weight" })).toBeEnabled();
  });
});
