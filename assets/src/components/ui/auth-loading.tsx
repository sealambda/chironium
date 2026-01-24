/**
 * Loading spinner component for authentication states.
 * Used while checking auth status before rendering protected routes.
 *
 * Per Apple HIG: Clear loading indication during authentication flow.
 * Per Carbon Design: Consistent loading pattern across the application.
 */
export function AuthLoading() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
