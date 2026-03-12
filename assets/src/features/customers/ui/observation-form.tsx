import * as m from "@/paraglide/messages";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { MarkdownEditor } from "@/shared/ui/markdown-editor";

interface ObservationFormProps {
  readonly body: string;
  readonly onBodyChange: (value: string) => void;
  readonly effectiveDate: string;
  readonly onEffectiveDateChange: (value: string) => void;
  readonly effectiveTime: string;
  readonly onEffectiveTimeChange: (value: string) => void;
  readonly disabled?: boolean;
  readonly rows?: number;
}

function ObservationForm({
  body,
  onBodyChange,
  effectiveDate,
  onEffectiveDateChange,
  effectiveTime,
  onEffectiveTimeChange,
  disabled,
  rows = 4,
}: Readonly<ObservationFormProps>) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field>
          <FieldLabel>{m.common_date()}</FieldLabel>
          <DatePickerString
            value={effectiveDate}
            onChange={onEffectiveDateChange}
            disabled={disabled}
          />
        </Field>
        <Field>
          <FieldLabel>{m.common_time()}</FieldLabel>
          <Input
            type="time"
            value={effectiveTime}
            onChange={(e) => onEffectiveTimeChange(e.target.value)}
            disabled={disabled}
          />
        </Field>
      </div>
      <MarkdownEditor
        value={body}
        onChange={onBodyChange}
        placeholder={m.field_observation_body_placeholder()}
        rows={rows}
        disabled={disabled}
      />
    </div>
  );
}

export { ObservationForm };
