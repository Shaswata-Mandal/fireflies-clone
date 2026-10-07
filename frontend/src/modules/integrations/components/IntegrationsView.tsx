"use client";

import { IntegrationCard } from "@/modules/integrations/components/IntegrationCard";
import {
  CONNECTED_EMPTY,
  DEFAULT_INTEGRATION_TAB,
  INTEGRATIONS,
  INTEGRATION_TABS,
  INTEGRATION_TAB_IDS,
} from "@/modules/integrations/constants";
import { TabList, tabElementId, tabPanelElementId } from "@/shared/components/TabList";
import { useTabParam } from "@/shared/hooks/use-tab-param";

const ID_PREFIX = "integrations";

/** Integrations page body: Discover (cards, all "Coming soon") and Connected (always empty). */
export function IntegrationsView() {
  const [tab, setTab] = useTabParam(INTEGRATION_TAB_IDS, DEFAULT_INTEGRATION_TAB);
  const EmptyIcon = CONNECTED_EMPTY.icon;

  return (
    <div className="mx-auto flex w-full max-w-250 flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-medium text-primary">Integrations</h1>
      <TabList
        tabs={INTEGRATION_TABS}
        activeId={tab}
        onChange={setTab}
        idPrefix={ID_PREFIX}
        label="Integration views"
        variant="segmented"
        className="self-start"
      />
      <div
        role="tabpanel"
        id={tabPanelElementId(ID_PREFIX, tab)}
        aria-labelledby={tabElementId(ID_PREFIX, tab)}
      >
        {tab === "discover" ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((integration) => (
              <IntegrationCard key={integration.id} integration={integration} />
            ))}
          </ul>
        ) : (
          <section className="flex flex-col items-center gap-3 rounded-xl border bg-card px-6 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-primary-subtle text-primary-fg">
              <EmptyIcon className="size-6" aria-hidden="true" />
            </span>
            <h2 className="text-base font-medium text-primary">{CONNECTED_EMPTY.title}</h2>
            <p className="max-w-sm text-sm text-muted">{CONNECTED_EMPTY.body}</p>
          </section>
        )}
      </div>
    </div>
  );
}
