import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
