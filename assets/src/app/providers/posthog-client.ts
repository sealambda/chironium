import posthog from "posthog-js";

import { runtimeConfig } from "@/shared/utils/runtime-config";

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

// Analytics stay off unless the deployment configures a PostHog project key.
if (runtimeConfig.posthogKey) {
  posthog.init(runtimeConfig.posthogKey, {
    // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
    api_host: runtimeConfig.posthogHost ?? "https://eu.i.posthog.com",
    // Only create person profiles for identified users to minimize noise.
    // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
    person_profiles: "identified_only",
    // On-screen text and attributes can contain patient data, so autocapture and
    // session recordings never collect them.
    // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
    mask_all_text: true,
    // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
    mask_all_element_attributes: true,
    // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: "*",
    },
    // The initial person info (`$initial_current_url`) rides on /flags requests, which skip
    // before_send, so PostHog must mask the code itself when it stores that URL.
    // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
    mask_personal_data_properties: true,
    // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
    custom_personal_data_properties: ["inviteCode"],
    // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
    before_send: (event) => event && maskInviteCodes(event),
  });
}

export { posthog };
