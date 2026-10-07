"use client";

import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { SettingsCard } from "@/modules/settings/components/SettingsCard";
import { useTheme } from "@/shared/context/ThemeContext";
import { cn } from "@/shared/utils/cn";
import type { ThemePreference } from "@/shared/utils/theme";

const OPTIONS: ReadonlyArray<{ id: ThemePreference; label: string; icon: LucideIcon }> = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
];

/** Light / Dark / System picker (docs/reference/34). A radiogroup: exactly one choice is active. */
export function AppearancePanel() {
  const { theme, setTheme } = useTheme();

  return (
    <SettingsCard
      title="Theme"
      description="Choose how the application looks. Select System to automatically match your device settings."
    >
      <div role="radiogroup" aria-label="Theme" className="flex flex-wrap gap-3">
        {OPTIONS.map(({ id, label, icon: Icon }) => {
          const selected = theme === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(id)}
              className={cn(
                "flex h-19 w-26 flex-col items-center justify-center gap-2 rounded-lg border bg-surface text-sm text-default hover:bg-hover",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                selected &&
                  "border-focus bg-primary-subtle text-primary-fg hover:bg-primary-subtle",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
}
