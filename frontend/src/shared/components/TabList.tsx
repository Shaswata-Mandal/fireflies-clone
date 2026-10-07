"use client";

import { Fragment, useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/shared/utils/cn";
import { nextTabIndex } from "@/shared/utils/tab-navigation";

export interface TabItem<TId extends string> {
  id: TId;
  label: string;
  icon?: ReactNode;
  /** Draws a divider before this tab (separates real tabs from "Coming soon" ones). */
  separatorBefore?: boolean;
}

interface TabListProps<TId extends string> {
  tabs: ReadonlyArray<TabItem<TId>>;
  activeId: TId;
  onChange: (id: TId) => void;
  /** Prefix for the tab / panel element ids, unique per page. */
  idPrefix: string;
  label: string;
  /** `segmented` = the "Notes | AI Skills" pill (17); `underline` = AskFred | Transcript (17, 19). */
  variant: "segmented" | "underline";
  className?: string;
}

export function tabElementId(idPrefix: string, id: string): string {
  return `${idPrefix}-tab-${id}`;
}

export function tabPanelElementId(idPrefix: string, id: string): string {
  return `${idPrefix}-panel-${id}`;
}

const VARIANT_CLASSES = {
  segmented: {
    list: "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border bg-card p-1",
    tab: "h-8 rounded-md px-3 text-sm whitespace-nowrap text-secondary hover:text-primary",
    active: "bg-active font-medium text-primary",
    separator: "mx-1 h-5 w-px shrink-0 bg-active",
  },
  underline: {
    list: "flex h-full items-end gap-6",
    tab: "-mb-px flex items-center gap-2 border-b-2 border-transparent px-1 pb-3 text-sm whitespace-nowrap text-tertiary hover:text-primary",
    active: "border-focus text-link hover:text-link",
    separator: "hidden",
  },
} as const;

/**
 * Accessible tablist (WAI-ARIA tabs pattern): roving tabindex, so Tab enters on the selected tab
 * and leaves the list; ←/→/Home/End move and activate at once ("automatic activation").
 * Only the selected tab points at a panel, because only that panel is rendered.
 */
export function TabList<TId extends string>({
  tabs,
  activeId,
  onChange,
  idPrefix,
  label,
  variant,
  className,
}: TabListProps<TId>) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const classes = VARIANT_CLASSES[variant];

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
    const nextIndex = nextTabIndex(event.key, currentIndex, tabs.length);
    if (nextIndex === null) return;
    event.preventDefault();
    onChange(tabs[nextIndex].id);
    tabRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={cn(classes.list, className)}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeId;
        return (
          <Fragment key={tab.id}>
            {tab.separatorBefore && <span aria-hidden="true" className={classes.separator} />}
            <button
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={tabElementId(idPrefix, tab.id)}
              aria-selected={isActive}
              aria-controls={isActive ? tabPanelElementId(idPrefix, tab.id) : undefined}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onChange(tab.id)}
              className={cn(
                classes.tab,
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                isActive && classes.active,
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
