import { useState } from "react";
import * as m from "@/paraglide/messages";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

interface CreateOrgModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { name: string; slug: string }) => Promise<void>;
  error: string | null;
}

/**
 * Modal for creating a new organisation.
 * Handles form state and slug auto-generation.
 */
export function CreateOrgModal({
  open,
  onOpenChange,
  onSubmit,
  error,
}: CreateOrgModalProps) {
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCancel = () => {
    setOrgName("");
    setOrgSlug("");
    setIsCreating(false);
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !orgSlug.trim()) {
      return;
    }
    setIsCreating(true);
    try {
      await onSubmit({ name: orgName.trim(), slug: orgSlug.trim() });
      setOrgName("");
      setOrgSlug("");
      onOpenChange(false);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogTitle>{m.org_create()}</AlertDialogTitle>
          <AlertDialogDescription>{m.org_create_desc()}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">{m.org_name()}</Label>
            <Input
              id="org-name"
              placeholder={m.org_name_placeholder()}
              value={orgName}
              onChange={(e) => {
                setOrgName(e.target.value);
                // Auto-generate slug from name.
                const slug = e.target.value
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-+|-+$/g, "");
                setOrgSlug(slug);
              }}
              disabled={isCreating}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="org-slug">{m.org_slug()}</Label>
            <Input
              id="org-slug"
              placeholder={m.org_slug_placeholder()}
              value={orgSlug}
              onChange={(e) => setOrgSlug(e.target.value)}
              disabled={isCreating}
            />
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isCreating}>
            {m.common_cancel()}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isCreating || !orgName.trim() || !orgSlug.trim()}
          >
            {isCreating ? m.common_creating() : m.org_create_submit()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
