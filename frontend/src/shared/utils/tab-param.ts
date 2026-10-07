/**
 * `?tab=` parsing.
 *
 * WHAT: Validates a query-string value against the allowed tab ids.
 * LAYER: Shared util (pure, unit-tested).
 * CALLED BY: `hooks/use-tab-param.ts`.
 * CALLS: nothing.
 * MERN EQUIVALENT: validating `req.query.tab` against a whitelist.
 */

/** `?tab=` value → one of the known tab ids; unknown or missing falls back to the first/default tab. */
export function parseTabParam<TId extends string>(
  value: string | null,
  ids: ReadonlyArray<TId>,
  fallback: TId,
): TId {
  // `find` returns the matching id with its precise type; comparing (not casting) is what keeps
  // an arbitrary URL string from being treated as a valid tab.
  return ids.find((id) => id === value) ?? fallback;
}
