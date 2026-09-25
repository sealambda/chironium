import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type AnswerMap,
  buildResponseTree,
  missingRequired,
} from "@/features/questionnaires/model/fill-helpers";
import {
  type Answer,
  questionnaireItemsSchema,
} from "@/features/questionnaires/model/questionnaire-schemas";
import { FillItems } from "@/features/questionnaires/ui/fill/fill-items";
import type { VariablesOf } from "@/graphql";
import * as m from "@/paraglide/messages";
import { PortalSessionError, requestPortal } from "@/portal/api/portal-client";
import { PortalRequestDocument, PortalSubmitResponseDocument } from "@/portal/api/portal-documents";
import type { PortalPath } from "@/portal/portal-app";
import { PortalShell } from "@/portal/ui/portal-shell";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Loading } from "@/shared/ui/loading";
import { getDateLocale } from "@/shared/utils/date-locale";

type SubmitVariables = VariablesOf<typeof PortalSubmitResponseDocument>;

function formatDate(iso: string | null | undefined): string | null {
  return iso ? format(parseISO(iso), "PPP", { locale: getDateLocale() }) : null;
}

interface RequestPageProps {
  navigate: (to: PortalPath) => void;
}

/** The patient's questionnaire request: who asked, by when, and the form. */
export function RequestPage({ navigate }: Readonly<RequestPageProps>) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [missing, setMissing] = useState<ReadonlySet<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const { data, error, isLoading } = useQuery({
    queryKey: ["portal", "request"],
    queryFn: () => requestPortal(PortalRequestDocument),
  });

  const task = data?.listTasks?.results?.[0] ?? null;

  // A session that has ended, or has nothing left to answer, can't be resumed.
  useEffect(() => {
    if (error instanceof PortalSessionError || (data && !task)) {
      navigate("/portal/link-expired");
    }
  }, [data, error, task, navigate]);

  const items = useMemo(() => {
    const parsed = questionnaireItemsSchema.safeParse(task?.focusQuestionnaire?.item ?? []);
    return parsed.success ? parsed.data : [];
  }, [task]);

  const setAnswer = (linkId: string, next: Answer[] | undefined) => {
    setAnswers((current) => ({ ...current, [linkId]: next }));
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
    if (!task) {
      return;
    }
    const unanswered = missingRequired(items, answers);
    if (unanswered.length > 0) {
      setMissing(new Set(unanswered));
      toast.error(m.questionnaire_fill_required_error());
      return;
    }

    setSubmitting(true);
    try {
      const variables: SubmitVariables = {
        input: {
          taskId: task.id,
          // The answer tree matches the recursive `QuestionnaireResponseItemInput`.
          item: buildResponseTree(items, answers) as SubmitVariables["input"]["item"],
        },
      };
      const result = await requestPortal(PortalSubmitResponseDocument, variables);
      const errors = result.submitQuestionnaireResponseFromPortal?.errors ?? [];
      if (errors.length > 0) {
        throw new Error(errors.map((e) => e.message).join(" "));
      }
      navigate("/portal/done");
    } catch (submitError) {
      if (submitError instanceof PortalSessionError) {
        navigate("/portal/link-expired");
        return;
      }
      toast.error(m.portal_submit_error());
      setSubmitting(false);
    }
  };

  if (isLoading || !task) {
    return (
      <PortalShell>
        {error && !(error instanceof PortalSessionError) ? (
          <p className="mt-8 text-center text-muted-foreground">{m.portal_load_error()}</p>
        ) : (
          <Loading />
        )}
      </PortalShell>
    );
  }

  const organization = task.organizationName ?? "";
  const dueDate = formatDate(task.requestedPeriod?.end);
  const sessionEnds = formatDate(task.accessExpiresAt);

  return (
    <PortalShell organizationName={organization} signedIn>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {task.focusQuestionnaire?.title || m.portal_title()}
          </CardTitle>
          <CardDescription>
            {task.requesterName
              ? m.portal_sent_by({ name: task.requesterName, organization })
              : m.portal_sent_by_organization({ organization })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {task.description ? (
            <p className="whitespace-pre-line rounded-lg bg-muted p-3">{task.description}</p>
          ) : null}
          {task.focusQuestionnaire?.description ? (
            <p className="text-muted-foreground">{task.focusQuestionnaire.description}</p>
          ) : null}
          {dueDate ? <p className="font-medium">{m.portal_due({ date: dueDate })}</p> : null}

          <FillItems items={items} answers={answers} onChange={setAnswer} missing={missing} />

          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            loading={submitting}
            data-testid="portal-submit"
          >
            {m.portal_submit()}
          </Button>

          <div className="space-y-1 text-muted-foreground text-xs">
            <p>{m.portal_privacy_note({ organization })}</p>
            {sessionEnds ? <p>{m.portal_session_note({ date: sessionEnds })}</p> : null}
          </div>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
