/** `?tab=` value → one of the known tab ids; unknown or missing falls back to the first/default tab. */
export function parseTabParam<TId extends string>(
  value: string | null,
  ids: ReadonlyArray<TId>,
  fallback: TId,
): TId {
  return ids.find((id) => id === value) ?? fallback;
}
