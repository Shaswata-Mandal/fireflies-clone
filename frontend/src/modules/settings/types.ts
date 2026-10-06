/** `GET /me` response (docs/api.md → Current user). */
export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
}
