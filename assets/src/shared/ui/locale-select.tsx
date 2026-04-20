import { type Locale, locales } from "@/paraglide/runtime";
import { LOCALE_OPTIONS } from "@/shared/i18n/locales";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
} from "@/shared/ui/select";

/** Inline flag + localized language name, shared by every locale picker. */
export function LocaleFlagLabel({ locale }: Readonly<{ locale: Locale }>) {
  const { flag: Flag, label } = LOCALE_OPTIONS[locale];
  return (
    <span className="flex items-center gap-2">
      <Flag className="h-4 w-6 shrink-0 overflow-hidden rounded-sm" aria-hidden="true" />
      <span>{label()}</span>
    </span>
  );
}

interface LocaleSelectProps {
  value: Locale;
  onChange: (locale: Locale | null) => void;
  /** Applied to the `SelectTrigger` for custom sizing or styling. */
  triggerClassName?: string;
  "data-testid"?: string;
}

/** Controlled dropdown that lets the user pick among the supported locales. */
export function LocaleSelect({
  value,
  onChange,
  triggerClassName,
  "data-testid": dataTestId,
}: Readonly<LocaleSelectProps>) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={triggerClassName} data-testid={dataTestId}>
        <LocaleFlagLabel locale={value} />
      </SelectTrigger>
      <SelectPositioner>
        <SelectContent>
          {locales.map((locale) => (
            <SelectItem key={locale} value={locale}>
              <LocaleFlagLabel locale={locale} />
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPositioner>
    </Select>
  );
}
