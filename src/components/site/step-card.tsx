import type { ReactNode } from "react";

export function StepCard({
  step,
  title,
  optional,
  children,
}: {
  step: number;
  title: string;
  optional?: boolean;
  children: ReactNode;
}) {
  const headingId = `step-${step}-title`;
  return (
    <section
      aria-labelledby={headingId}
      className="rounded-2xl border bg-card p-4 shadow-sm md:p-5"
    >
      <h3 id={headingId} className="mb-4 flex items-center gap-3 font-bold">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {step}
        </span>
        {title}
        {optional && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            Opsional
          </span>
        )}
      </h3>
      {children}
    </section>
  );
}
