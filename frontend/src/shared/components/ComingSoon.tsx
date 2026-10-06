import type { LucideIcon } from "lucide-react";
import { COMING_SOON } from "@/shared/constants/messages";

interface ComingSoonProps {
  title: string;
  icon: LucideIcon;
  description?: string;
}

const DEFAULT_DESCRIPTION = "This section is being built and will be available in a later release.";

/** Placeholder page body: title plus a centred empty state, sized like the Fireflies empty states. */
export function ComingSoon({
  title,
  icon: Icon,
  description = DEFAULT_DESCRIPTION,
}: ComingSoonProps) {
  return (
    <div className="mx-auto flex w-full max-w-205 flex-col gap-8 px-6 py-8">
      <h1 className="text-2xl font-medium text-primary">{title}</h1>
      <section className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary-subtle text-primary-fg">
          <Icon className="size-6" aria-hidden="true" />
        </span>
        <h2 className="text-base font-medium text-primary">{COMING_SOON}</h2>
        <p className="max-w-sm text-sm text-muted">{description}</p>
      </section>
    </div>
  );
}
