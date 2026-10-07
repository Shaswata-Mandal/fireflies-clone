/**
 * User/participant avatar.
 *
 * WHAT: A small square showing an image or coloured initials.
 * LAYER: Shared component (server-safe).
 * CALLED BY: navbar avatar, participant stacks, assignee chips.
 * CALLS: `utils/initials.ts`, `cn`.
 * MERN EQUIVALENT: MUI's `<Avatar>`.
 */

import { getInitials } from "@/shared/utils/initials";
import { cn } from "@/shared/utils/cn";

interface UserAvatarProps {
  name: string | null | undefined;
  avatarUrl?: string | null;
  /** Per-person color from the API (`avatar_color`); falls back to the user token. */
  color?: string | null;
  className?: string;
}

/** Square avatar with initials on the user color (colors.md §1.8); an image when the user has one. */
// @param name used for the initials; @param avatarUrl optional image; @param color optional bg
export function UserAvatar({ name, avatarUrl, color, className }: UserAvatarProps) {
  const base = cn("size-6 shrink-0 rounded-sm", className);

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external host, no next/image config
    return <img src={avatarUrl} alt="" className={cn(base, "object-cover")} />;
  }

  return (
    <span
      aria-hidden="true"
      // The color is data (each participant has their own), so it can't be a Tailwind class.
      style={color ? { backgroundColor: color } : undefined}
      className={cn(
        base,
        "flex items-center justify-center bg-avatar-user text-xs font-medium text-on-primary",
      )}
    >
      {getInitials(name)}
    </span>
  );
}
