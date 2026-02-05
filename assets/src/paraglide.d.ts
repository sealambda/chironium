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

  // Table headers
  export function table_start(): LocalizedString;
  export function table_end(): LocalizedString;
  export function table_date(): LocalizedString;
  export function table_status(): LocalizedString;
  export function table_duration(): LocalizedString;
  export function table_name(): LocalizedString;
  export function table_category(): LocalizedString;
  export function table_weight(): LocalizedString;
  export function table_height(): LocalizedString;
  export function table_bmi(): LocalizedString;
  export function table_period(): LocalizedString;
  export function table_kcal(): LocalizedString;
  export function table_protein(): LocalizedString;
  export function table_carbs(): LocalizedString;
  export function table_fat(): LocalizedString;
  export function table_length(): LocalizedString;
  export function table_symptoms(): LocalizedString;
  export function table_diagnosed(): LocalizedString;

  // Empty states
  export function empty_no_data(): LocalizedString;
  export function empty_no_history(): LocalizedString;
  export function empty_no_measurements(): LocalizedString;
  export function empty_no_symptoms(): LocalizedString;

  // Customers
  export function customers_title(): LocalizedString;
  export function customers_total(): LocalizedString;
  export function customers_add(): LocalizedString;
  export function customers_empty(): LocalizedString;
  export function customers_empty_desc(): LocalizedString;
  export function customers_no_org(): LocalizedString;
  export function customers_no_org_desc(): LocalizedString;
  export function customers_error(): LocalizedString;

  // Customer detail
  export function customer_not_found(): LocalizedString;
  export function customer_not_found_desc(): LocalizedString;
  export function customer_back(): LocalizedString;

  // Create customer
  export function create_customer_title(): LocalizedString;
  export function create_customer_desc(): LocalizedString;
  export function create_customer_submit(): LocalizedString;

  // Form labels
  export function form_personal_info(): LocalizedString;
  export function form_contact_info(): LocalizedString;
  export function form_subscription(): LocalizedString;
  export function form_name(): LocalizedString;
  export function form_name_placeholder(): LocalizedString;
  export function form_email(): LocalizedString;
  export function form_phone(): LocalizedString;
  export function form_instagram(): LocalizedString;
  export function form_instagram_placeholder(): LocalizedString;
  export function form_start_date(): LocalizedString;
  export function form_plan_duration(): LocalizedString;
  export function form_end_date(): LocalizedString;
  export function form_end_date_auto(): LocalizedString;
  export function form_select_date(): LocalizedString;

  // Plans
  export function plan_months(params: { count: number }): LocalizedString;
  export function plan_unknown(): LocalizedString;
  export function plan_loading(): LocalizedString;
  export function plan_mo(): LocalizedString;

  // Stats
  export function stat_subscription(): LocalizedString;
  export function stat_body_metrics(): LocalizedString;
  export function stat_nutrition(): LocalizedString;
  export function stat_pathologies(): LocalizedString;
  export function stat_cycle(): LocalizedString;
  export function stat_no_plan(): LocalizedString;
  export function stat_no_data(): LocalizedString;
  export function stat_no_pathologies(): LocalizedString;
  export function stat_weight(): LocalizedString;
  export function stat_daily_target(): LocalizedString;
  export function stat_day(): LocalizedString;
  export function stat_active(): LocalizedString;
  export function stat_symptoms_tracked(): LocalizedString;
  export function stat_cycle_completed(): LocalizedString;
  export function stat_current_cycle(): LocalizedString;
  export function stat_last_cycle(): LocalizedString;

  // Cycle phases
  export function cycle_menstruation(): LocalizedString;
  export function cycle_follicular(): LocalizedString;
  export function cycle_ovulation(): LocalizedString;
  export function cycle_luteal(): LocalizedString;

  // Drawers
  export function drawer_subscription(): LocalizedString;
  export function drawer_body_metrics(): LocalizedString;
  export function drawer_nutrition(): LocalizedString;
  export function drawer_cycle(): LocalizedString;
  export function drawer_pathologies(): LocalizedString;
  export function drawer_add_subscription(): LocalizedString;
  export function drawer_add_record(): LocalizedString;
  export function drawer_add_plan(): LocalizedString;
  export function drawer_add_cycle(): LocalizedString;
  export function drawer_add_pathology(): LocalizedString;

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

  export * as m from "@/paraglide/messages";
}

declare module "@/paraglide/runtime" {
  export const baseLocale: "en";
  export const locales: readonly ["en", "es"];
  export type Locale = (typeof locales)[number];

  export function getLocale(): Locale;
  export function setLocale(
    locale: Locale,
    options?: { reload?: boolean },
  ): void;
}
