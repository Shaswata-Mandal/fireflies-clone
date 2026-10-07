/**
 * Settings types.
 *
 * WHAT: The shape of `GET /me`.
 * LAYER: Module types (type-only).
 * CALLED BY: `settings/api.ts` and the components that show the user.
 */

/** `GET /me` response (docs/api.md → Current user). */
export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}
