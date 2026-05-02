"use client";

import { format, isValid, parse, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { getDatePickerDisplayFormat, toDateInput } from "@/shared/utils/date-time-input";
import { cn } from "@/shared/utils/utils";

interface DatePickerProps {
  readonly value?: Date;
  readonly onChange?: (date: Date | undefined) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly inputTestId?: string;
  readonly endMonth?: Date;
  readonly startMonth?: Date;
}

function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  inputTestId,
  endMonth,
  startMonth,
}: DatePickerProps) {
  const displayFormat = getDatePickerDisplayFormat();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(() => (value ? format(value, displayFormat) : ""));
  const [calendarMonth, setCalendarMonth] = useState<Date>(value ?? new Date());

  // Sync calendar month when value changes (e.g., typing a date)
  useEffect(() => {
    if (value) {
      setCalendarMonth(value);
    }
  }, [value]);

  // Sync input when value changes externally (e.g., calendar pick)
  useEffect(() => {
    setInputValue(value ? format(value, displayFormat) : "");
  }, [value, displayFormat]);

  function handleSelect(date: Date | undefined) {
    onChange?.(date);
    setOpen(false);
  }

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value.replaceAll(/[^\d/]/g, "");

      const isDeleting = (e.nativeEvent as InputEvent).inputType?.startsWith("delete");
      if (isDeleting) {
        // Strip trailing slashes so the user doesn't get stuck when backspacing.
        raw = raw.replace(/\/+$/, "");
      } else {
        // Auto-insert slashes only when typing forward.
        const digits = raw.replaceAll("/", "");
        if (digits.length >= 4) {
          raw = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
        } else if (digits.length >= 2) {
          raw = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        }
      }

      setInputValue(raw);

      // Try parsing when we have a full date string
      if (raw.length === 10) {
        const parsed = parse(raw, displayFormat, new Date());
        if (isValid(parsed)) {
          onChange?.(parsed);
        }
      }
    },
    [onChange, displayFormat],
  );

  return (
    <div className="flex gap-2">
      <Input
        data-testid={inputTestId}
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder ?? displayFormat.toLowerCase()}
        disabled={disabled}
        className={cn("flex-1", className)}
        maxLength={10}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              size="icon"
              disabled={disabled}
              aria-label={m.common_date()}
              className="shrink-0 border-primary/40 bg-primary/10 text-primary shadow-xs hover:bg-primary/15"
            />
          }
        >
          <CalendarIcon aria-hidden />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selected={value}
            onSelect={handleSelect}
            endMonth={endMonth}
            startMonth={startMonth}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface DatePickerStringProps {
  readonly value?: string;
  readonly onChange?: (dateStr: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly inputTestId?: string;
  readonly endMonth?: Date;
  readonly startMonth?: Date;
}

function DatePickerString({
  value,
  onChange,
  disabled,
  endMonth,
  startMonth,
  inputTestId,
  ...rest
}: DatePickerStringProps) {
  const dateValue = value ? parseISO(value) : undefined;

  function handleChange(date: Date | undefined) {
    onChange?.(date ? toDateInput(date) : "");
  }

  return (
    <DatePicker
      value={dateValue}
      onChange={handleChange}
      disabled={disabled}
      inputTestId={inputTestId}
      endMonth={endMonth}
      startMonth={startMonth}
      {...rest}
    />
  );
}

export { DatePickerString };
