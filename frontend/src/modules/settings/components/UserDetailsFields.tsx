"use client";

import { useCurrentUser } from "@/modules/settings/hooks";
import { ErrorState } from "@/shared/components/ErrorState";
import { FormField } from "@/shared/components/FormField";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { showComingSoon } from "@/shared/utils/coming-soon";

interface UserDetailsFieldsProps {
  /** Prefix for the input ids, unique per panel. */
  idPrefix: string;
  /** Account shows the email only; Profile shows name and email. */
  showName: boolean;
  /** Names the feature in the "Coming soon" toast, e.g. "Saving your profile". */
  saveFeature: string;
}

const READ_ONLY_INPUT =
  "h-9 w-full rounded-md border border-strong bg-card px-3 text-sm text-default outline-none";

/** The signed-in user's details, read-only: there is no real auth, so Save only says "Coming soon". */
export function UserDetailsFields({ idPrefix, showName, saveFeature }: UserDetailsFieldsProps) {
  const { data: user, isPending, isError, error, refetch, isRefetching } = useCurrentUser();

  if (isPending) {
    return (
      <div role="status" aria-label="Loading account" className="flex flex-col gap-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load your account"
        error={error}
        onRetry={() => void refetch()}
        isRetrying={isRefetching}
      />
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        showComingSoon(saveFeature);
      }}
    >
      {showName && (
        <FormField htmlFor={`${idPrefix}-name`} label="Name">
          <input id={`${idPrefix}-name`} value={user.name} readOnly className={READ_ONLY_INPUT} />
        </FormField>
      )}
      <FormField htmlFor={`${idPrefix}-email`} label="Email">
        <input
          id={`${idPrefix}-email`}
          type="email"
          value={user.email}
          readOnly
          className={READ_ONLY_INPUT}
        />
      </FormField>
      <div>
        <button
          type="submit"
          className="h-9 rounded-md bg-primary-600 px-4 text-sm font-medium text-on-primary hover:bg-primary-700"
        >
          Save changes
        </button>
      </div>
    </form>
  );
}
