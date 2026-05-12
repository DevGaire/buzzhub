import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon | (() => JSX.Element);
  emoji?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Consistent empty-state card. Renders an icon or emoji, a one-line
 * title, an optional secondary description and an optional CTA. Use
 * this anywhere a list could plausibly be empty.
 */
export default function EmptyState({
  icon: Icon,
  emoji,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-card p-8 text-center shadow-sm",
        className,
      )}
    >
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-2xl">
        {emoji ? <span aria-hidden>{emoji}</span> : Icon ? <Icon className="size-6 text-muted-foreground" /> : null}
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
