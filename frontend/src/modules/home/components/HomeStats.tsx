"use client";

import { CalendarCheck, ListTodo, Rss, Sparkles } from "lucide-react";
import { useOpenActionItems } from "@/modules/action-items/hooks";
import { StatCard } from "@/modules/home/components/StatCard";
import { HOME_LIST_LIMIT } from "@/modules/home/constants";
import { useMeetings } from "@/modules/meetings/hooks";

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** "Personal Assistant" row (docs/reference/08). Counts come from the lists' `total`, so no extra endpoint. */
export function HomeStats() {
  const meetings = useMeetings({ limit: HOME_LIST_LIMIT, sort: "-meeting_date" });
  const openItems = useOpenActionItems(HOME_LIST_LIMIT);

  const meetingsSubtitle = meetings.isError
    ? null
    : meetings.data && `From: ${plural(meetings.data.total, "meeting")}`;
  const tasksSubtitle = openItems.isError
    ? null
    : openItems.data && plural(openItems.data.total, "open action item");

  return (
    <section aria-labelledby="assistant-heading" className="flex flex-col gap-3">
      <h2 id="assistant-heading" className="flex items-center gap-2 text-base text-default">
        <Sparkles className="size-4" aria-hidden="true" />
        Personal Assistant
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Daily Brief" icon={Rss} subtitle={meetingsSubtitle} />
        <StatCard title="Meeting Prep" icon={CalendarCheck} subtitle="No upcoming meetings" />
        <StatCard title="Tasks" icon={ListTodo} subtitle={tasksSubtitle} />
      </div>
    </section>
  );
}
