import { createFileRoute } from '@tanstack/react-router';

import { DashboardPage } from '@/pages/dashboard';

/**
 * Dashboard route (currently disabled in navigation).
 * Protected by _authenticated layout - requires authentication.
 */
export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});
