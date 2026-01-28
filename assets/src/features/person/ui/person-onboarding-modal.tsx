import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import type { Person } from "@/features/auth/types";
import type { PersonOnboardingData } from "@/features/person/model/person-onboarding";
import { validatePersonOnboardingData } from "@/features/person/model/person-onboarding";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Calendar } from "@/shared/ui/calendar";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/utils";

interface PersonOnboardingModalProps {
  open: boolean;
  person: Person | null | undefined;
  onSubmit: (data: PersonOnboardingData) => Promise<void>;
  error: string | null;
}

/**
 * Compulsory modal for person onboarding.
 * Shown when required Person fields are missing after sign-in.
 * User must fill all required fields before proceeding.
 */
export function PersonOnboardingModal({
  open,
  person,
  onSubmit,
  error,
}: PersonOnboardingModalProps) {
  const [formData, setFormData] = useState<Partial<PersonOnboardingData>>({
    givenName: person?.givenName || "",
    stSurname: person?.stSurname || "",
    ndSurname: person?.ndSurname || "",
    birthDate: person?.birthDate || "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!validatePersonOnboardingData(formData)) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = validatePersonOnboardingData(formData);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>Complete Your Profile</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide the following information to complete your profile. All fields are
            required.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="given-name">Given Name</Label>
            <Input
              id="given-name"
              placeholder="John"
              value={formData.givenName || ""}
              onChange={(e) => setFormData({ ...formData, givenName: e.target.value })}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="st-surname">First Surname</Label>
            <Input
              id="st-surname"
              placeholder="Doe"
              value={formData.stSurname || ""}
              onChange={(e) => setFormData({ ...formData, stSurname: e.target.value })}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="nd-surname">Second Surname</Label>
            <Input
              id="nd-surname"
              placeholder="Smith"
              value={formData.ndSurname || ""}
              onChange={(e) => setFormData({ ...formData, ndSurname: e.target.value })}
              disabled={isSubmitting}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="birth-date">Birth Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="birth-date"
                  variant="outline"
                  disabled={isSubmitting}
                  data-empty={!formData.birthDate}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    "data-[empty=true]:text-muted-foreground",
                  )}
                >
                  <CalendarIcon />
                  {formData.birthDate ? (
                    format(new Date(formData.birthDate), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.birthDate ? new Date(formData.birthDate) : undefined}
                  onSelect={(date) => {
                    setFormData({
                      ...formData,
                      birthDate: date ? format(date, "yyyy-MM-dd") : "",
                    });
                  }}
                  captionLayout="dropdown"
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                />
              </PopoverContent>
            </Popover>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting || !isFormValid}>
            {isSubmitting ? "Saving..." : "Complete Profile"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
