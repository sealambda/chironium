import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
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
  builderReducer,
  builderStateFrom,
  emptyBuilderState,
} from "@/features/questionnaires/model/builder-reducer";
import { QuestionnaireBuilder } from "@/features/questionnaires/ui/builder/questionnaire-builder";
import * as m from "@/paraglide/messages";
import { Route } from "@/routes/_app/questionnaires_.$questionnaireId";
import { Button } from "@/shared/ui/button";
import { Loading } from "@/shared/ui/loading";
import { questionnairesQueryKeys } from "@/shared/utils/query-keys";

export function QuestionnaireBuilderPage() {
  const { questionnaireId } = Route.useParams();
  const isNew = questionnaireId === "new";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedOrg } = useOrg();
  const orgId = selectedOrg?.id;

  const [state, dispatch] = useReducer(builderReducer, undefined, emptyBuilderState);
  const [saving, setSaving] = useState(false);
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

    const input: QuestionnaireFormInput = {
      title: state.title,
      status: state.status,
      version: state.version,
      description: state.description,
      item: state.items,
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
    }
  };

  if (!isNew && isLoading) {
    return <Loading />;
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={goBack}>
          <ArrowLeft className="size-4" />
          {m.questionnaire_back_to_library()}
        </Button>
        <div className="flex gap-2">
          {!isNew ? (
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {m.common_delete()}
            </Button>
          ) : null}
          <Button onClick={handleSave} loading={saving} disabled={saving}>
            {saving ? m.common_saving() : m.common_save()}
          </Button>
        </div>
      </div>

      <QuestionnaireBuilder state={state} dispatch={dispatch} organizationId={orgId ?? ""} />
    </div>
  );
}
