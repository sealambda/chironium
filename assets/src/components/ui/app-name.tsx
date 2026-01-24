import { cn } from '@/lib/utils';

interface AppNameProps {
  className?: string;
}

/**
 * Styled app name component.
 * Displays "CHIRONIUM" in uppercase with small-caps style per brand guidelines.
 *
 * The small-caps variant creates a sophisticated typographic effect where
 * all letters appear uppercase but lowercase letters are rendered smaller.
 */
export function AppName({ className }: AppNameProps) {
  return (
    <span
      className={cn('font-semibold uppercase tracking-wide', className)}
      style={{ fontVariant: 'small-caps' }}
    >
      CHIRONIUM
    </span>
  );
}
