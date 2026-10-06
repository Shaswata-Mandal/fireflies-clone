import { getInitials } from "@/shared/utils/initials";
import { cn } from "@/shared/utils/cn";

interface UserAvatarProps {
  name: string | null | undefined;
  avatarUrl?: string | null;
  className?: string;
}

/** Square avatar with initials on the user color (colors.md §1.8); an image when the user has one. */
export function UserAvatar({ name, avatarUrl, className }: UserAvatarProps) {
  const base = cn("size-6 shrink-0 rounded-sm", className);

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external host, no next/image config
    return <img src={avatarUrl} alt="" className={cn(base, "object-cover")} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        base,
        "flex items-center justify-center bg-avatar-user text-xs font-medium text-on-primary",
      )}
    >
      {getInitials(name)}
    </span>
  );
}
