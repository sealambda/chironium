import * as m from "@/paraglide/messages";
import { runtimeConfig } from "@/shared/utils/runtime-config";

/**
 * Warns demo visitors that their data is temporary. The patient portal shows the
 * same banner from `portal_root.html.heex`.
 */
export function DemoBanner() {
  if (!runtimeConfig.demo) {
    return null;
  }

  return (
    <div
      role="note"
      className="my-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg bg-amber-100 px-4 py-2 text-center text-sm text-amber-950"
      data-testid="demo-banner"
    >
      <span>{m.demo_banner()}</span>
      <a
        href="https://sealambda.com"
        target="_blank"
        rel="noreferrer"
        className="font-medium underline underline-offset-4"
      >
        {m.demo_made_by()}
      </a>
    </div>
  );
}
