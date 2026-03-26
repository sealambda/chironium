import { useCanGoBack, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/shared/ui/button";

export function BackButton() {
  const router = useRouter();
  const canGoBack = useCanGoBack();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-10 shrink-0"
      aria-label="Go back"
      onClick={() => (canGoBack ? router.history.back() : router.navigate({ to: ".." }))}
    >
      <ArrowLeft className="size-5" />
    </Button>
  );
}
