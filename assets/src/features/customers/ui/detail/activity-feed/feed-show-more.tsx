import { useEffect, useRef } from "react";

interface FeedShowMoreProps {
  hasMore: boolean;
  onShowMore: () => void;
}

/** Invisible sentinel that triggers `onShowMore` when scrolled into view. */
export function FeedShowMore({ hasMore, onShowMore }: Readonly<FeedShowMoreProps>) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onShowMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, onShowMore]);

  if (!hasMore) {
    return null;
  }

  return <div ref={sentinelRef} className="h-px" aria-hidden />;
}
