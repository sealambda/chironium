// Type declarations for generated Paraglide modules

declare module "@/paraglide/messages" {
  export type LocalizedString = string & { __brand: "LocalizedString" };

  // Navigation
  export function nav_dashboard(): LocalizedString;
  export function nav_customers(): LocalizedString;
  export function nav_welcome(params: { name: string }): LocalizedString;
  export function nav_sign_out(): LocalizedString;

  // Error pages
  export function error_not_found(): LocalizedString;
  export function error_not_found_desc(): LocalizedString;
  export function go_home(): LocalizedString;

  // Common
  export function common_cancel(): LocalizedString;
  export function common_loading(): LocalizedString;
  export function common_saving(): LocalizedString;
  export function common_creating(): LocalizedString;
  export function common_add(): LocalizedString;
  export function common_back(): LocalizedString;
  export function common_close(): LocalizedString;
  export function common_open(): LocalizedString;
  export function common_ongoing(): LocalizedString;
  export function common_unknown(): LocalizedString;

  // Table headers
  export function table_bmi(): LocalizedString;

  // Customers
  export function customers_title(): LocalizedString;
  export function customers_total(): LocalizedString;
  export function customers_empty(): LocalizedString;
  export function customers_empty_desc(): LocalizedString;
  export function customers_no_org(): LocalizedString;
  export function customers_no_org_desc(): LocalizedString;
  export function customers_error(): LocalizedString;

  // Customer detail
  export function customer_not_found(): LocalizedString;
  export function customer_not_found_desc(): LocalizedString;
  export function customer_back(): LocalizedString;

  // Stats
  export function stat_no_plan(): LocalizedString;

  // Measurements
  export function measurement_chest(): LocalizedString;
  export function measurement_waist(): LocalizedString;
  export function measurement_hip(): LocalizedString;
  export function measurement_biceps(): LocalizedString;
  export function measurement_quadriceps(): LocalizedString;

  // Organization
  export function org_create(): LocalizedString;
  export function org_create_desc(): LocalizedString;
  export function org_name(): LocalizedString;
  export function org_name_placeholder(): LocalizedString;
  export function org_slug(): LocalizedString;
  export function org_slug_placeholder(): LocalizedString;
  export function org_create_submit(): LocalizedString;
  export function org_created(): LocalizedString;
  export function org_create_error(): LocalizedString;
  export function org_none(): LocalizedString;

  // Dashboard
  export function dashboard_coming_soon(): LocalizedString;
  export function dashboard_coming_soon_desc(): LocalizedString;

  // Contact
  export function contact_email(params: { name: string }): LocalizedString;
  export function contact_whatsapp(params: { name: string }): LocalizedString;
  export function contact_instagram(params: { name: string }): LocalizedString;

  // Data table
  export function data_table_empty(): LocalizedString;
  export function data_table_empty_desc(): LocalizedString;
  export function data_table_collapse(): LocalizedString;
  export function data_table_expand(): LocalizedString;

  // Subscription status
  export function sub_no_active(): LocalizedString;
  export function sub_today(): LocalizedString;
  export function sub_expired(): LocalizedString;

  // Biometric
  export function biometric_recorded_days_ago(params: { count: number }): LocalizedString;
  export function biometric_recorded_today(): LocalizedString;
  export function biometric_whr(): LocalizedString;
  export function biometric_no_records(): LocalizedString;
  export function biometric_no_records_desc(): LocalizedString;
  export function biometric_group_torso(): LocalizedString;
  export function biometric_group_limbs(): LocalizedString;

  // Nutrition
  export function nutrition_no_plan(): LocalizedString;
  export function nutrition_no_plan_desc(): LocalizedString;
  export function nutrition_preferences_title(): LocalizedString;
  export function nutrition_more_restrictions(params: { count: number }): LocalizedString;
  export function nutrition_status_active(): LocalizedString;
  export function nutrition_status_inactive(): LocalizedString;
  export function nutrition_macro_protein(): LocalizedString;
  export function nutrition_macro_carbs(): LocalizedString;
  export function nutrition_macro_fat(): LocalizedString;
  export function nutrition_started_today(): LocalizedString;
  export function nutrition_started_days_ago(params: { count: number }): LocalizedString;

  export * as m from "@/paraglide/messages";
}

declare module "@/paraglide/runtime" {
  export const baseLocale: "en";
  export const locales: readonly ["en", "es"];
  export type Locale = (typeof locales)[number];

  export function getLocale(): Locale;
  export function setLocale(locale: Locale, options?: { reload?: boolean }): void;
}
