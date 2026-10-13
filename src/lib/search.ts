/**
 * Shared search helpers.
 *
 * A query is split into words, so spaces never break a search:
 *   "lyka mae"        → matches "Marabulas, Lyka Mae A."
 *   "marabulas lyka"  → also matches (words can be in any order)
 *   "lyka "           → trailing/extra spaces are ignored
 * Every word must appear somewhere in at least one of the searched fields.
 */
export function searchTerms(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter(Boolean);
}

export function matchesSearch(query: string, ...fields: (string | number | null | undefined)[]): boolean {
  const terms = searchTerms(query);
  if (terms.length === 0) return true;
  const haystack = fields
    .filter((f) => f !== null && f !== undefined && f !== "")
    .map((f) => String(f).toLowerCase())
    .join(" \u0000 ");
  return terms.every((t) => haystack.includes(t));
}
