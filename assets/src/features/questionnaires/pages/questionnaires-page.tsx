import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNowStrict } from "date-fns";
import { ClipboardList, FilePlus2, Plus } from "lucide-react";
import { useState } from "react";

import {
  fetchQuestionnaires,
  type QuestionnaireListItem,
  type QuestionnaireStatus,
} from "@/features/questionnaires/api/questionnaires-api";
import { QUESTIONNAIRE_TEMPLATES } from "@/features/questionnaires/model/templates";
import * as m from "@/paraglide/messages";
import { useOrg } from "@/shared/session/use-org";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
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

/** "Start from scratch or a template" picker, shown when creating a questionnaire. */
function TemplatePickerDialog({
  open,
  onOpenChange,
  onPick,
}: Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (templateId: string | undefined) => void;
}>) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>{m.questionnaire_template_pick_title()}</DialogTitle>
          <DialogDescription>{m.questionnaire_template_pick_desc()}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Card
            className="cursor-pointer p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
            onClick={() => onPick(undefined)}
          >
            <div className="flex items-center gap-3">
              <FilePlus2 className="size-5 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">{m.questionnaire_template_blank()}</p>
                <p className="text-muted-foreground text-sm">
                  {m.questionnaire_template_blank_desc()}
                </p>
              </div>
            </div>
          </Card>
          {QUESTIONNAIRE_TEMPLATES.map((template) => (
            <Card
              key={template.id}
              className="cursor-pointer p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
              onClick={() => onPick(template.id)}
            >
              <div className="flex items-center gap-3">
                <ClipboardList className="size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{template.name()}</p>
                  <p className="text-muted-foreground text-sm">{template.description()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function QuestionnairesPage() {
  const { selectedOrg } = useOrg();
  const navigate = useNavigate();
  const orgId = selectedOrg?.id;
  const [pickerOpen, setPickerOpen] = useState(false);

  const { data: questionnaires, isLoading } = useQuery({
    queryKey: questionnairesQueryKeys.list(orgId ?? ""),
    queryFn: () => fetchQuestionnaires(orgId ?? ""),
    enabled: Boolean(orgId),
  });

  const open = (id: string, template?: string) =>
    navigate({
      to: "/questionnaires/$questionnaireId",
      params: { questionnaireId: id },
      search: template ? { template } : undefined,
    });

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
          actions={[{ label: m.questionnaire_new(), onAction: () => setPickerOpen(true) }]}
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
    <div className="flex flex-col gap-4 pt-7">
      <header className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <h1 className="font-bold text-foreground text-xl uppercase tracking-wide">
            {m.questionnaire_library_title()}
          </h1>
          <p className="text-muted-foreground text-sm">{m.questionnaire_library_hint()}</p>
        </div>
        <Button onClick={() => setPickerOpen(true)}>
          <Plus className="size-4" />
          {m.questionnaire_new()}
        </Button>
      </header>

      {renderContent()}

      <TemplatePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(templateId) => {
          setPickerOpen(false);
          void open("new", templateId);
        }}
      />
    </div>
  );
}
