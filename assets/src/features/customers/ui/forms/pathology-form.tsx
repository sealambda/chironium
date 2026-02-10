import { useForm } from "@tanstack/react-form";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";

import { PathologyCatalog } from "@/mocks/data/pathology-catalog";
import type { PathologyCatalogEntry } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/shared/ui/combobox";
import { Field, FieldContent, FieldGroup, FieldLabel, FieldSeparator } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";

import {
  defaultPathologyValues,
  type PathologyFormData,
  pathologyFormSchema,
} from "../../model/detail-schemas";
import { DatePickerField } from "../date-picker-field";

interface PathologyFormProps {
  id: string;
  onSubmit: (data: PathologyFormData) => void;
}

export function PathologyForm({ id, onSubmit }: Readonly<PathologyFormProps>) {
  const [showResolution, setShowResolution] = useState(false);
  const form = useForm({
    defaultValues: defaultPathologyValues,
    onSubmit: async ({ value }) => {
      const result = pathologyFormSchema.safeParse(value);
      if (!result.success) {
        return;
      }
      onSubmit(value);
    },
  });

  const handleSelectPathology = (value: string, entry: PathologyCatalogEntry | undefined) => {
    if (entry) {
      form.setFieldValue("pathologyId", entry.id);
      form.setFieldValue("pathologyName", entry.name);
      form.setFieldValue("isChronic", entry.isChronic);
    } else {
      form.setFieldValue("pathologyId", value);
      form.setFieldValue("pathologyName", "");
      form.setFieldValue("isChronic", false);
    }
  };

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
      <FieldGroup>
        {/* Pathology picker */}
        <form.Field name="pathologyId">
          {(field) => (
            <Field>
              <FieldLabel>
                {m.form_select_pathology()} <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Combobox
                  value={field.state.value}
                  onValueChange={(val) => {
                    const entry = PathologyCatalog.find((p) => p.id === val);
                    handleSelectPathology(val, entry);
                  }}
                >
                  <ComboboxInput
                    placeholder={m.form_search_pathology()}
                    showClear={Boolean(field.state.value)}
                  />
                  <ComboboxContent>
                    <ComboboxList>
                      {PathologyCatalog.map((entry) => (
                        <ComboboxItem key={entry.id} value={entry.id} label={entry.name}>
                          {entry.name}
                        </ComboboxItem>
                      ))}
                    </ComboboxList>
                    <ComboboxEmpty>{m.form_no_results()}</ComboboxEmpty>
                  </ComboboxContent>
                </Combobox>
              </FieldContent>
            </Field>
          )}
        </form.Field>

        {/* Diagnosis date */}
        <form.Subscribe selector={(s) => s.values.diagnosedDateUnknown}>
          {(isUnknown) => (
            <form.Field name="diagnosedDate">
              {(field) => (
                <Field>
                  <FieldLabel>
                    {m.form_diagnosed_date()}{" "}
                    {!isUnknown ? <span className="text-destructive">*</span> : null}
                  </FieldLabel>
                  <FieldContent>
                    <div className="space-y-2">
                      <DatePickerField
                        value={isUnknown ? undefined : field.state.value}
                        onChange={(date) => field.handleChange(date)}
                        disabled={isUnknown}
                      />
                      <label className="flex items-center gap-2 text-muted-foreground text-sm">
                        <input
                          type="checkbox"
                          checked={isUnknown}
                          onChange={(e) => {
                            form.setFieldValue("diagnosedDateUnknown", e.target.checked);
                            if (e.target.checked) {
                              form.setFieldValue("diagnosedDate", undefined);
                            }
                          }}
                          className="accent-primary"
                        />
                        {m.form_unknown_date()}
                      </label>
                    </div>
                  </FieldContent>
                </Field>
              )}
            </form.Field>
          )}
        </form.Subscribe>
      </FieldGroup>

      <FieldSeparator />

      {/* Collapsible resolution section */}
      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setShowResolution((prev) => !prev)}
      >
        <ChevronRightIcon
          className={`size-4 text-muted-foreground transition-transform ${showResolution ? "rotate-90" : ""}`}
        />
        <span className="font-semibold text-base text-foreground">{m.form_resolution()}</span>
      </button>

      {showResolution ? (
        <FieldGroup>
          <form.Subscribe selector={(s) => s.values.resolvedDateUnknown}>
            {(isUnknown) => (
              <form.Field name="resolvedDate">
                {(field) => (
                  <Field>
                    <FieldLabel>{m.form_resolved_date()}</FieldLabel>
                    <FieldContent>
                      <div className="space-y-2">
                        <DatePickerField
                          value={isUnknown ? undefined : field.state.value}
                          onChange={(date) => field.handleChange(date)}
                          disabled={isUnknown}
                        />
                        <label className="flex items-center gap-2 text-muted-foreground text-sm">
                          <input
                            type="checkbox"
                            checked={isUnknown}
                            onChange={(e) => {
                              form.setFieldValue("resolvedDateUnknown", e.target.checked);
                              if (e.target.checked) {
                                form.setFieldValue("resolvedDate", undefined);
                              }
                            }}
                            className="accent-primary"
                          />
                          {m.form_unknown_date()}
                        </label>
                      </div>
                    </FieldContent>
                  </Field>
                )}
              </form.Field>
            )}
          </form.Subscribe>
        </FieldGroup>
      ) : null}

      <FieldSeparator />

      {/* Notes */}
      <FieldGroup>
        <form.Field name="notes">
          {(field) => (
            <Field>
              <FieldLabel>{m.form_notes()}</FieldLabel>
              <FieldContent>
                <Textarea
                  placeholder={m.form_notes_placeholder()}
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </form>
  );
}
