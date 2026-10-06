import { ArrowLeft, SearchX } from "lucide-react";
import Link from "next/link";
import { ROUTES } from "@/shared/constants/routes";

/** 404 from the API (or a non-numeric id): someone else's meeting looks exactly the same. */
export function MeetingNotFound() {
  return (
    <section className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <SearchX className="size-10 text-muted" aria-hidden="true" />
      <h1 className="text-xl font-medium text-primary">Meeting not found</h1>
      <p className="max-w-sm text-sm text-muted">It may have been deleted, or the link is wrong.</p>
      <Link
        href={ROUTES.MEETINGS}
        className="mt-2 flex h-9 items-center gap-2 rounded-md bg-primary-600 px-4 text-sm font-medium text-on-primary hover:bg-primary-700"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to meetings
      </Link>
    </section>
  );
}
