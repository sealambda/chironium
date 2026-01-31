import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/shared/ui/field";
import { PhoneInput } from "@/shared/ui/phone-input";
import {
  createFieldValidator,
  mapFieldErrors,
} from "@/shared/utils/form-utils";
import {
  type CustomerFormData,
  customerFormSchema,
  defaultCustomerFormValues,
  emailSchema,
  instagramSchema,
  nameSchema,
  phoneSchema,
  planDurationSchema,
  startDateSchema,
} from "../model/customer-schema";
import { DatePickerField } from "./date-picker-field";
import { EmailInput } from "./email-input";
import { InstagramInput } from "./instagram-input";
import { NameInput } from "./name-input";
import { PlanDurationSelect } from "./plan-duration-select";

interface CustomerFormProps {
  id?: string;
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
  hideFooter?: boolean;
  /** Initial values for editing an existing customer */
  initialValues?: CustomerFormData;
  /** Submit button text - defaults to "Create Customer" */
  submitLabel?: string;
}

/**
 * Customer creation form using TanStack Form + Zod validation.
 * Mobile-first design with stacked fields and 44px touch targets.
 * Uses field-level validators so each field only validates itself on blur.
 */
export function CustomerForm({
  id,
  onSubmit,
  onCancel,
  hideFooter,
  initialValues,
  submitLabel = "Create Customer",
}: Readonly<CustomerFormProps>) {
  const form = useForm({
    defaultValues: initialValues ?? defaultCustomerFormValues,
    // No form-level validators - we use field-level validators instead.
    onSubmit: async ({ value }) => {
      // Validate full schema on submit.
      const result = customerFormSchema.safeParse(value);
      if (!result.success) return;
      onSubmit(value);
    },
  });

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-6 pt-4"
    >
      {/* Personal Information */}
      <FieldGroup>
        <h3 className="text-base font-semibold text-foreground">
          Personal Information
        </h3>

        <form.Field
          name="name"
          validators={{ onBlur: createFieldValidator(nameSchema) }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>
                Full Name <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <NameInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                  placeholder="Enter full name"
                  autoComplete="name"
                />
                <FieldError errors={mapFieldErrors(field.state.meta.errors)} />
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <FieldSeparator />

      {/* Contact Information */}
      <FieldGroup>
        <h3 className="text-base font-semibold text-foreground">
          Contact Information
        </h3>

        <form.Field
          name="contact.email"
          validators={{ onBlur: createFieldValidator(emailSchema) }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <FieldContent>
                <EmailInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value || ""}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                  placeholder="email@example.com"
                  autoComplete="email"
                />
                <FieldError errors={mapFieldErrors(field.state.meta.errors)} />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="contact.phone"
          validators={{ onBlur: createFieldValidator(phoneSchema) }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>Phone</FieldLabel>
              <FieldContent>
                <PhoneInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value || ""}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={mapFieldErrors(field.state.meta.errors)} />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="contact.instagram"
          validators={{ onBlur: createFieldValidator(instagramSchema) }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel htmlFor={field.name}>Instagram</FieldLabel>
              <FieldContent>
                <InstagramInput
                  id={field.name}
                  name={field.name}
                  value={field.state.value || ""}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                <FieldError errors={mapFieldErrors(field.state.meta.errors)} />
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <FieldSeparator />

      {/* Subscription */}
      <FieldGroup>
        <h3 className="text-base font-semibold text-foreground">
          Subscription
        </h3>

        <form.Field
          name="subscription.startDate"
          validators={{ onBlur: createFieldValidator(startDateSchema) }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel>
                Start Date <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <DatePickerField
                  value={field.state.value}
                  onChange={(date) => field.handleChange(date ?? new Date())}
                />
                <FieldError errors={mapFieldErrors(field.state.meta.errors)} />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="subscription.planDurationMonths"
          validators={{ onBlur: createFieldValidator(planDurationSchema) }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel>
                Plan Duration <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <PlanDurationSelect
                  value={field.state.value}
                  onChange={field.handleChange}
                  className="w-full"
                />
                <FieldError errors={mapFieldErrors(field.state.meta.errors)} />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        {/* Calculated End Date (read-only) */}
        <form.Subscribe selector={(state) => state.values.subscription}>
          {(subscription) => {
            const { startDate, planDurationMonths } = subscription;
            if (!startDate) return null;

            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + planDurationMonths);

            return (
              <Field>
                <FieldLabel>End Date</FieldLabel>
                <FieldContent>
                  <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-2.5 text-muted-foreground text-sm">
                    {format(endDate, "PPP")}
                  </div>
                  <FieldDescription>
                    Automatically calculated from start date and duration
                  </FieldDescription>
                </FieldContent>
              </Field>
            );
          }}
        </form.Subscribe>
      </FieldGroup>

      {/* Footer Actions - Only render if not hidden. */}
      {!hideFooter && (
        <div className="sticky bottom-0 flex flex-col gap-3 border-t bg-background pt-4 pb-safe sm:flex-row sm:justify-end sm:gap-3">
          {/* Cancel button - secondary action, less prominent */}
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="order-2 sm:order-1"
          >
            Cancel
          </Button>

          {/* Create button - primary action */}
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                disabled={!canSubmit || isSubmitting}
                className="order-1 sm:order-2"
              >
                {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                {isSubmitting ? "Saving..." : submitLabel}
              </Button>
            )}
          </form.Subscribe>
        </div>
      )}
    </form>
  );
}
