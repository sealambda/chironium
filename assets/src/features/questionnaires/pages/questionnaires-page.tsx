import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { ClipboardList, Plus } from "lucide-react";

import { useOrg } from "@/features/org/hooks/use-org";
import {
  fetchQuestionnaires,
  type QuestionnaireListItem,
  type QuestionnaireStatus,
} from "@/features/questionnaires/api/questionnaires-api";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Loading } from "@/shared/ui/loading";
import { getDateLocale } from "@/shared/utils/date-locale";
import { questionnairesQueryKeys } from "@/shared/utils/query-keys";

function statusLabel(status: QuestionnaireStatus): string {
  switch (status) {
    case "ACTIVE":
      return m.questionnaire_status_active();
    case "DRAFT":
      return m.questionnaire_status_draft();
    case "RETIRED":
      return m.questionnaire_status_retired();
    default:
      return m.questionnaire_status_unknown();
  }
}

function statusVariant(status: QuestionnaireStatus): "default" | "secondary" | "outline" {
  if (status === "ACTIVE") {
    return "default";
  }
  if (status === "DRAFT") {
    return "secondary";
  }
  return "outline";
}

function QuestionnaireRow({
  questionnaire,
  onOpen,
}: Readonly<{ questionnaire: QuestionnaireListItem; onOpen: () => void }>) {
  return (
    <Card
      className="cursor-pointer p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">
            {questionnaire.title || m.questionnaire_untitled()}
          </p>
          {questionnaire.description ? (
            <p className="mt-0.5 line-clamp-2 text-muted-foreground text-sm">
              {questionnaire.description}
            </p>
          ) : null}
          {questionnaire.date ? (
            <p className="mt-1 text-muted-foreground text-xs">
              {m.questionnaire_updated_prefix()}{" "}
              {formatDistanceToNowStrict(new Date(questionnaire.date), {
                addSuffix: true,
                locale: getDateLocale(),
              })}
            </p>
          ) : null}
        </div>
        <Badge variant={statusVariant(questionnaire.status)}>
          {statusLabel(questionnaire.status)}
        </Badge>
      </div>
    </Card>
  );
}

export function QuestionnairesPage() {
  const { selectedOrg } = useOrg();
  const navigate = useNavigate();
  const orgId = selectedOrg?.id;

  const { data: questionnaires, isLoading } = useQuery({
    queryKey: questionnairesQueryKeys.list(orgId ?? ""),
    queryFn: () => fetchQuestionnaires(orgId ?? ""),
    enabled: Boolean(orgId),
  });

  const open = (id: string) =>
    navigate({ to: "/questionnaires/$questionnaireId", params: { questionnaireId: id } });

  function renderContent() {
    if (isLoading) {
      return <Loading />;
    }
    if (!questionnaires || questionnaires.length === 0) {
      return (
        <EmptyState
          icon={ClipboardList}
          title={m.questionnaire_empty_title()}
          description={m.questionnaire_empty_desc()}
          actions={[{ label: m.questionnaire_new(), onAction: () => open("new") }]}
        />
      );
    }
    return (
      <div className="space-y-3">
        {questionnaires.map((questionnaire) => (
          <QuestionnaireRow
            key={questionnaire.id}
            questionnaire={questionnaire}
            onOpen={() => open(questionnaire.id)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4 lg:p-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-semibold text-xl">{m.questionnaire_library_title()}</h1>
        <Button onClick={() => open("new")}>
          <Plus className="size-4" />
          {m.questionnaire_new()}
        </Button>
      </div>

      {renderContent()}
    </div>
  );
}
