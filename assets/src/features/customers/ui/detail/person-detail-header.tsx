import { Pencil } from "lucide-react";
import { useState } from "react";

import type { Person } from "@/features/customers/api/persons-api";
import { EditPersonDialog } from "@/features/customers/ui/detail/edit-person-dialog";
import { BackButton } from "@/shared/ui/back-button";
import { Button } from "@/shared/ui/button";

interface PersonDetailHeaderProps {
  readonly person?: Person | null;
}

/** Person detail header with back button and edit action. */
export function PersonDetailHeader({ person }: PersonDetailHeaderProps) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="flex w-full items-center justify-between">
      <BackButton />

      {person ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="size-10 shrink-0"
            aria-label="Edit personal information"
            data-testid="customer-person-edit-button"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" />
          </Button>
          <EditPersonDialog person={person} open={editOpen} onOpenChange={setEditOpen} />
        </>
      ) : null}
    </div>
  );
}
