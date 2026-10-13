import { Fragment } from "react";
import { searchTerms } from "@/lib/search";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Renders `text` with every part that matches the search query highlighted in yellow.
 * Each word of the query is highlighted on its own, so "lyka mae" marks both words.
 */
export function Highlight({ text, query }: { text: string | number | null | undefined; query: string }) {
  const value = text === null || text === undefined ? "" : String(text);
  const terms = searchTerms(query);
  if (!value || terms.length === 0) return <>{value}</>;

  // Longest words first so "mae" doesn't split a longer match like "maea".
  const pattern = new RegExp(
    `(${[...terms].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`,
    "gi",
  );
  const parts = value.split(pattern);

  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="search-hit">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
