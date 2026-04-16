import posthog from "posthog-js";

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
  api_host: import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com",
  // Only create person profiles for identified users to minimize noise.
  // biome-ignore lint/style/useNamingConvention: PostHog API option names use snake_case.
  person_profiles: "identified_only",
});

export { posthog };
