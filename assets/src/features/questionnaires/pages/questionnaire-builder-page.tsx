import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, Pencil } from "lucide-react";
import { useEffect, useReducer, useState } from "react";
import { toast } from "sonner";

import { useOrg } from "@/features/org/hooks/use-org";
import {
  createQuestionnaire,
  deleteQuestionnaire,
  fetchQuestionnaire,
  type QuestionnaireFormInput,
  updateQuestionnaire,
} from "@/features/questionnaires/api/questionnaires-api";
import {
  type BuilderState,
  builderReducer,
  builderStateFrom,
  emptyBuilderState,
  hasOptionlessChoices,
  pruneEmptyOptions,
} from "@/features/questionnaires/model/builder-reducer";
import type { AnswerMap } from "@/features/questionnaires/model/fill-helpers";
import { findTemplate } from "@/features/questionnaires/model/templates";
import { QuestionnaireBuilder } from "@/features/questionnaires/ui/builder/questionnaire-builder";
import { FillItems } from "@/features/questionnaires/ui/fill/fill-items";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/questionnaires_.$questionnaireId";
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
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Loading } from "@/shared/ui/loading";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { questionnairesQueryKeys } from "@/shared/utils/query-keys";

/** Seed a new builder from the picked template, or start blank. */
function initialBuilderState(isNew: boolean, templateId: string | undefined): BuilderState {
  if (!isNew) {
    return emptyBuilderState();
  }
  const template = findTemplate(templateId);
  if (!template) {
    return emptyBuilderState();
  }
  const { title, description, items } = template.build();
  return builderStateFrom({ title, status: "DRAFT", version: "", description, items });
}

/** Interactive preview: the exact form practitioners will fill. Answers are throwaway. */
function BuilderPreview({ state }: Readonly<{ state: BuilderState }>) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{state.title || m.questionnaire_untitled()}</CardTitle>
        {state.description ? (
          <p className="text-muted-foreground text-sm">{state.description}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {state.items.length > 0 ? (
          <FillItems
            items={state.items}
            answers={answers}
            onChange={(linkId, next) => setAnswers((current) => ({ ...current, [linkId]: next }))}
          />
        ) : (
          <p className="text-muted-foreground text-sm">{m.questionnaire_preview_empty()}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function QuestionnaireBuilderPage() {
  const { questionnaireId } = Route.useParams();
  const { template } = Route.useSearch();
  const isNew = questionnaireId === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedOrg } = useOrg();
  const orgId = selectedOrg?.id;

  const [state, dispatch] = useReducer(builderReducer, undefined, () =>
    initialBuilderState(isNew, template),
  );
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [initialized, setInitialized] = useState(isNew);

  const { data: existing, isLoading } = useQuery({
    queryKey: questionnairesQueryKeys.detail(orgId ?? "", questionnaireId),
    queryFn: () => fetchQuestionnaire(questionnaireId, orgId ?? ""),
    enabled: Boolean(orgId) && !isNew,
  });

  // Seed the reducer once the definition loads (edit mode only).
  useEffect(() => {
    if (initialized || !existing) {
      return;
    }
    dispatch({
      type: "init",
      state: builderStateFrom({
        title: existing.title ?? "",
        status: existing.status,
        version: existing.version ?? "",
        description: existing.description ?? "",
        items: existing.item,
      }),
    });
    setInitialized(true);
  }, [existing, initialized]);

  const goBack = () => {
    void navigate({ to: "/questionnaires" });
  };

  const handleSave = async () => {
    if (!orgId) {
      return;
    }
    if (state.title.trim() === "") {
      toast.error(m.questionnaire_title_required());
      return;
    }
    if (hasOptionlessChoices(state.items)) {
      toast.error(m.questionnaire_options_required());
      return;
    }
    // The options editor keeps a blank row ready to type; drop those before saving.
    const items = pruneEmptyOptions(state.items);

    const input: QuestionnaireFormInput = {
      title: state.title,
      status: state.status,
      version: state.version,
      description: state.description,
      item: items,
    };

    setSaving(true);
    try {
      if (isNew) {
        await createQuestionnaire(input, orgId);
      } else {
        await updateQuestionnaire(questionnaireId, input, orgId);
      }
      await queryClient.invalidateQueries({ queryKey: questionnairesQueryKeys.list(orgId) });
      // Clear the cached detail (not just invalidate) so reopening refetches the saved
      // version. The builder seeds its tree once per mount; if the stale pre-save detail
      // were still cached, that one-shot seed would show the old content after an edit.
      queryClient.removeQueries({
        queryKey: questionnairesQueryKeys.detail(orgId, questionnaireId),
      });
      toast.success(m.questionnaire_save_success());
      goBack();
    } catch {
      toast.error(m.questionnaire_save_error());
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!orgId || isNew) {
      return;
    }
    setSaving(true);
    try {
      await deleteQuestionnaire(questionnaireId, orgId);
      await queryClient.invalidateQueries({ queryKey: questionnairesQueryKeys.list(orgId) });
      toast.success(m.questionnaire_delete_success());
      goBack();
    } catch {
      toast.error(m.questionnaire_save_error());
    } finally {
      setSaving(false);
      setConfirmingDelete(false);
    }
  };

  if (!isNew && isLoading) {
    return <Loading />;
  }

  return (
    <div className="flex flex-col gap-4 pt-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="size-4" />
          {m.questionnaire_back_to_library()}
        </Button>
        <div className="flex items-center gap-2">
          <ToggleGroup
            size="sm"
            className="w-auto"
            value={mode}
            onValueChange={(v) => setMode(v as "edit" | "preview")}
          >
            <ToggleGroupItem value="edit" className="px-3">
              <Pencil className="mr-1.5 size-3.5" />
              {m.questionnaire_mode_edit()}
            </ToggleGroupItem>
            <ToggleGroupItem value="preview" className="px-3">
              <Eye className="mr-1.5 size-3.5" />
              {m.questionnaire_mode_preview()}
            </ToggleGroupItem>
          </ToggleGroup>
          {!isNew ? (
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
              disabled={saving}
            >
              {m.common_delete()}
            </Button>
          ) : null}
          <Button onClick={handleSave} loading={saving} disabled={saving}>
            {saving ? m.common_saving() : m.common_save()}
          </Button>
        </div>
      </header>

      {mode === "edit" ? (
        <QuestionnaireBuilder state={state} dispatch={dispatch} />
      ) : (
        <BuilderPreview state={state} />
      )}

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.questionnaire_delete_title()}</AlertDialogTitle>
            <AlertDialogDescription>{m.questionnaire_delete_desc()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmingDelete(false)} disabled={saving}>
              {m.common_cancel()}
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} loading={saving}>
              {m.common_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
