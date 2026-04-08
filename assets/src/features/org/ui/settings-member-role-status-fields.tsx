import type { SettingsMemberTableRow } from "@/features/org/utils/settings-member-table-model";
import * as m from "@/paraglide/messages";

/** Role and status labels for compact (mobile card) member rows. */
export function SettingsMemberRoleStatusFields({ row }: Readonly<{ row: SettingsMemberTableRow }>) {
  return (
    <dl className="mt-2 grid gap-1 text-sm">
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        <dt className="shrink-0 text-muted-foreground">{m.settings_members_role_col()}</dt>
        <dd className="min-w-0">{row.roleDisplay}</dd>
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0.5">
        <dt className="shrink-0 text-muted-foreground">{m.settings_members_status_col()}</dt>
        <dd className="min-w-0">{row.status}</dd>
      </div>
    </dl>
  );
}
