import { X } from "lucide-react";

/**
 * Small "×" button shown inside a search input once something has been typed.
 * Place it as a sibling of the <input> inside a `relative` wrapper, and give
 * the input enough right padding (pr-9) so text doesn't run under it.
 */
export function SearchClearButton({ value, onClear }: { value: string; onClear: () => void }) {
  if (!value) return null;
  return (
    <button
      type="button"
      aria-label="Clear search"
      title="Clear search"
      onClick={(e) => {
        onClear();
        // Keep the cursor in the search box so the user can type again right away.
        e.currentTarget.parentElement?.querySelector("input")?.focus();
      }}
      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );
}
