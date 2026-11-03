import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Shown beside the title, e.g. a wishlist's icon. */
  icon?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

/** Big serif title block shared by every signed-in page. */
export function PageHeader({
  eyebrow,
  title,
  icon,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 pb-8 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4">
      {icon}
      <div className="min-w-0 space-y-2">
        {eyebrow && (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="break-words font-display text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-xl text-lg text-muted-foreground">{description}</p>
        )}
      </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </header>
  );
}

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-input px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-secondary text-primary [&_svg]:size-6">
        {icon}
      </div>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="max-w-sm text-muted-foreground">{description}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
