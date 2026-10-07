"use client";

import { Upload, Video } from "lucide-react";
import Link from "next/link";
import { HOME_COPY } from "@/modules/home/constants";
import { getGreeting } from "@/modules/home/utils";
import { useCurrentUser } from "@/modules/settings/hooks";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { ROUTES } from "@/shared/constants/routes";

const PRIMARY_LINK =
  "flex h-9 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-on-primary hover:bg-primary-700";
const OUTLINE_LINK =
  "flex h-9 items-center gap-2 rounded-md border bg-card px-4 text-sm text-default hover:bg-hover";

/** Headline plus the two quick actions. */
export function HomeGreeting() {
  const { data: user, isPending } = useCurrentUser();

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {isPending ? (
        // The greeting depends on the viewer's clock, so it waits for client data (no SSR mismatch).
        <Skeleton className="h-8 w-72 max-w-full" />
      ) : (
        <h1 className="text-2xl font-medium text-primary">
          {user
            ? `${getGreeting(new Date().getHours())}, ${user.name}`
            : HOME_COPY.FALLBACK_GREETING}
        </h1>
      )}
      <div className="flex flex-wrap gap-2">
        <Link href={ROUTES.UPLOADS} className={PRIMARY_LINK}>
          <Upload className="size-4" aria-hidden="true" />
          Upload meeting
        </Link>
        <Link href={ROUTES.MEETINGS} className={OUTLINE_LINK}>
          <Video className="size-4" aria-hidden="true" />
          View all meetings
        </Link>
      </div>
    </header>
  );
}
