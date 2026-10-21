import type { PatientTask } from "@/features/tasks/api/tasks-api";

interface TaskEventProps {
  task: PatientTask;
}

export function TaskEvent({ task }: Readonly<TaskEventProps>) {
  if (!task.description) {
    return null;
  }

  return <p className="text-sm text-foreground/80">{task.description}</p>;
}
