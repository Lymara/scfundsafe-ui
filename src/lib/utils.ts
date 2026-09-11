import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Rejects "dummy" purposes typed just to get past a required-field check -
 * a single period, a row of dashes, "asdf", etc. Requires, after trimming:
 * at least 3 characters, and at least 2 of them alphanumeric (so punctuation
 * alone can never satisfy it). This is intentionally lenient about what
 * counts as "meaningful" - it only screens out the obvious placeholder
 * cases, not anything that looks like a real (if terse) description.
 */
export function isMeaningfulPurpose(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 3) return false;
  const alphanumericCount = (trimmed.match(/[a-zA-Z0-9]/g) ?? []).length;
  return alphanumericCount >= 2;
}

/**
 * Converts an ALL-CAPS (or any-case) name into a readable Title Case,
 * without touching the underlying stored value - purely a display concern.
 * Handles hyphens and apostrophes so names like "DELA-CRUZ" or "O'BRIEN"
 * come out as "Dela-Cruz" / "O'Brien" rather than "Dela-cruz" / "O'brien".
 */
export function toTitleCase(input: string): string {
  if (!input) return input;
  return input
    .toLowerCase()
    .replace(/(^|[\s\-'.,()])([a-z])/g, (_match, boundary: string, letter: string) => boundary + letter.toUpperCase());
}

/**
 * Builds the canonical "Last, First M." display name from separate parts -
 * this is how every student name is stored and shown across the app
 * (roster, reports, receipts, activity log). Middle initial is optional.
 */
export function formatStudentName(lastName: string, firstName: string, middleInitial?: string): string {
  const last = lastName.trim();
  const first = firstName.trim();
  const mi = (middleInitial ?? "").trim().replace(/\.+$/, ""); // drop any trailing period the user typed themselves
  return mi ? `${last}, ${first} ${mi}.` : `${last}, ${first}`;
}

/**
 * Best-effort split of a stored full name back into last/first/middle-initial
 * parts, used to pre-fill the Edit form. Handles both "Last, First M." (the
 * current canonical format) and "First M. Last" (older entries added before
 * name fields were split out). It's a starting point for editing, not a
 * guaranteed-perfect parse of every possible name.
 */
export function parseStudentName(fullName: string): { lastName: string; firstName: string; middleInitial: string } {
  const isInitial = (w: string) => /^[a-zA-Z]\.?$/.test(w);

  if (fullName.includes(",")) {
    const [lastPart, ...restParts] = fullName.split(",");
    const words = restParts.join(",").trim().split(/\s+/).filter(Boolean);
    if (words.length > 0 && isInitial(words[words.length - 1])) {
      return {
        lastName: lastPart.trim(),
        firstName: words.slice(0, -1).join(" "),
        middleInitial: words[words.length - 1].replace(".", ""),
      };
    }
    return { lastName: lastPart.trim(), firstName: words.join(" "), middleInitial: "" };
  }

  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) {
    return { lastName: words[0] ?? "", firstName: "", middleInitial: "" };
  }
  const lastName = words[words.length - 1];
  const maybeInitial = words[words.length - 2];
  if (words.length >= 3 && isInitial(maybeInitial)) {
    return { lastName, firstName: words.slice(0, -2).join(" "), middleInitial: maybeInitial.replace(".", "") };
  }
  return { lastName, firstName: words.slice(0, -1).join(" "), middleInitial: "" };
}

/**
 * First-name-initial + last-name-initial for the roster avatar circle, e.g.
 * "LM" for Lyka Mae Marabulas - regardless of whether the underlying
 * fullName happens to be stored "Last, First" or "First Last".
 */
export function studentInitials(fullName: string): string {
  const { firstName, lastName } = parseStudentName(fullName);
  const firstInitial = firstName.trim().charAt(0) || lastName.trim().charAt(0) || "";
  const lastInitial = lastName.trim().charAt(0) || "";
  return (firstInitial + lastInitial).toUpperCase() || "?";
}

/**
 * Turns a series of points into a smooth SVG path (Catmull-Rom converted to
 * cubic Beziers) instead of straight-line segments between each point - used
 * by the Cash Flow line charts so the line actually curves rather than
 * looking like a jagged connect-the-dots. With 0-2 points there's nothing
 * meaningful to curve, so those fall back to a plain move/line.
 */
export function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}
