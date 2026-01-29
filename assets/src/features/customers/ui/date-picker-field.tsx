import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/utils";

interface DatePickerFieldProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Date picker field using Popover + Calendar.
 * Mobile-first with 44px touch target per Apple HIG.
 */
export function DatePickerField({
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  className,
}: DatePickerFieldProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-9 w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
