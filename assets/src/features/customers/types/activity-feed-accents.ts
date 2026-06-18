export type FeedEventAccent =
  | "blue"
  | "amber"
  | "emerald"
  | "orange"
  | "red"
  | "slate"
  | "sky"
  | "violet"
  | "yellow";

export const accentIconClass: Record<FeedEventAccent, string> = {
  blue: "text-blue-800 dark:text-blue-300",
  amber: "text-amber-700 dark:text-amber-300",
  emerald: "text-emerald-700 dark:text-emerald-300",
  orange: "text-orange-700 dark:text-orange-300",
  red: "text-red-700 dark:text-red-300",
  slate: "text-slate-700 dark:text-slate-300",
  sky: "text-sky-700 dark:text-sky-300",
  violet: "text-violet-700 dark:text-violet-300",
  yellow: "text-yellow-700 dark:text-yellow-300",
};

export const accentDotBgClass: Record<FeedEventAccent, string> = {
  blue: "bg-blue-100 dark:bg-blue-900/30",
  amber: "bg-amber-100 dark:bg-amber-900/30",
  emerald: "bg-emerald-100 dark:bg-emerald-900/30",
  orange: "bg-orange-100 dark:bg-orange-900/30",
  red: "bg-red-100 dark:bg-red-900/30",
  slate: "bg-slate-100 dark:bg-slate-800/60",
  sky: "bg-sky-100 dark:bg-sky-900/30",
  violet: "bg-violet-100 dark:bg-violet-900/30",
  yellow: "bg-yellow-100 dark:bg-yellow-900/30",
};
