import posthog from "posthog-js";

// Invite codes are credentials, and invitees land on `/app?inviteCode=…` before the
// app strips it. Also matches the URL-encoded form inside return URLs.
const INVITE_CODE_PARAM = /(inviteCode(?:=|%3D))[^&#%\s]*/gi;

function maskInviteCodes<T>(value: T): T {
  if (typeof value === "string") {
    return value.replace(INVITE_CODE_PARAM, "$1<MASKED>") as T;
  }
  if (Array.isArray(value)) {
    return value.map(maskInviteCodes) as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, maskInviteCodes(entry)]),
    ) as T;
  }
  return value;
}

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
  api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com",
  // Only create person profiles for identified users to minimize noise.
  // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
  person_profiles: "identified_only",
  // The initial person info (`$initial_current_url`) rides on /flags requests, which skip
  // before_send, so PostHog must mask the code itself when it stores that URL.
  // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
  mask_personal_data_properties: true,
  // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
  custom_personal_data_properties: ["inviteCode"],
  // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
  before_send: (event) => event && maskInviteCodes(event),
});

export { posthog };
