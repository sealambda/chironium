import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import { submitResponse } from "@/features/questionnaires/api/questionnaire-responses-api";
import {
  fetchQuestionnaire,
  fetchQuestionnaires,
} from "@/features/questionnaires/api/questionnaires-api";
import {
  type AnswerMap,
  buildResponseTree,
  missingRequired,
} from "@/features/questionnaires/model/fill-helpers";
import type { Answer } from "@/features/questionnaires/model/questionnaire-schemas";
import { FillItems } from "@/features/questionnaires/ui/fill/fill-items";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Loading } from "@/shared/ui/loading";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { patientResponsesQueryKey, questionnairesQueryKeys } from "@/shared/utils/query-keys";

interface FillDialogProps {
  personId: string;
  patientId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuestionnaireFillDialog({
  personId,
  patientId,
  open,
  onOpenChange,
}: Readonly<FillDialogProps>) {
  const { selectedOrg } = useOrg();
  const orgId = selectedOrg?.id;
  const queryClient = useQueryClient();

  const [selectedId, setSelectedId] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Reset when the dialog reopens.
  useEffect(() => {
    if (open) {
      setSelectedId("");
      setAnswers({});
      setMissing(new Set());
    }
  }, [open]);

  const { data: questionnaires } = useQuery({
    queryKey: questionnairesQueryKeys.list(orgId ?? ""),
    queryFn: () => fetchQuestionnaires(orgId ?? ""),
    enabled: open && Boolean(orgId),
  });

  const activeQuestionnaires = useMemo(
    () => (questionnaires ?? []).filter((q) => q.status === "ACTIVE"),
    [questionnaires],
  );

  const { data: selected, isLoading: loadingDetail } = useQuery({
    queryKey: questionnairesQueryKeys.detail(orgId ?? "", selectedId),
    queryFn: () => fetchQuestionnaire(selectedId, orgId ?? ""),
    enabled: open && Boolean(orgId) && selectedId !== "",
  });

  const setAnswer = (linkId: string, next: Answer[] | undefined) => {
    setAnswers((current) => ({ ...current, [linkId]: next }));
    // A newly answered question clears its own missing flag right away.
    setMissing((current) => {
      if (!current.has(linkId)) {
        return current;
      }
      const updated = new Set(current);
      updated.delete(linkId);
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!orgId || !patientId || !selected) {
      return;
    }
    const unanswered = missingRequired(selected.item, answers);
    if (unanswered.length > 0) {
      setMissing(new Set(unanswered));
      toast.error(m.questionnaire_fill_required_error());
      return;
    }

    setSaving(true);
    try {
      const tree = buildResponseTree(selected.item, answers);
      await submitResponse(selected.id, patientId, tree, orgId);
      await queryClient.invalidateQueries({
        queryKey: patientResponsesQueryKey(orgId, patientId),
      });
      // Extraction may create observations, so refresh the patient detail too.
      await invalidatePersonDetail(queryClient, personId);
      toast.success(m.questionnaire_fill_success());
      onOpenChange(false);
    } catch {
      toast.error(m.questionnaire_fill_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl" showCloseButton>
        <DialogHeader>
          <DialogTitle>{m.questionnaire_fill_title()}</DialogTitle>
          <DialogDescription>{m.questionnaire_fill_subtitle()}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto">
          <Field>
            <FieldLabel>{m.questionnaire_fill_pick()}</FieldLabel>
            <Select
              value={selectedId}
              onValueChange={(v) => {
                setSelectedId(v ?? "");
                setAnswers({});
                setMissing(new Set());
              }}
              items={activeQuestionnaires.map((q) => ({
                value: q.id,
                label: q.title || m.questionnaire_untitled(),
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={m.questionnaire_fill_pick_placeholder()} />
              </SelectTrigger>
              <SelectPositioner>
                <SelectContent>
                  {activeQuestionnaires.map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.title || m.questionnaire_untitled()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPositioner>
            </Select>
          </Field>

          {selectedId && loadingDetail ? <Loading /> : null}

          {selected ? (
            <FillItems
              items={selected.item}
              answers={answers}
              onChange={setAnswer}
              missing={missing}
            />
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleSubmit} loading={saving} disabled={saving || !selected}>
            {m.questionnaire_fill_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
