import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectPickerOption {
  value: string;
  label: string;
}

const VIEWPORT_MARGIN = 8;
const GAP = 4;

/**
 * A dark-themed, fully-visible dropdown for a fixed set of options - e.g.
 * Payment Method or Year Level. Unlike a native <select>, the open panel
 * always renders with the app's own dark surface and light text, so it's
 * never washed out by the browser/OS default (white background, unreadable
 * text). No add/delete here - for an editable list, see CategoryPicker.
 *
 * If one of the options is literally "Other" (or you pass `otherValue` to
 * point at a different option), picking it opens the same inline
 * "type your own" text box the Category dropdown uses, instead of just
 * silently selecting the word "Other" with no way to say what it means.
 * Pass `otherText` / `onOtherTextChange` to wire that typed detail into
 * your own state (e.g. a reference/notes field).
 *
 * The dropdown panel is rendered through a React Portal straight onto
 * document.body - see the comment in date-picker.tsx for why. In short:
 * ".surface-lift" uses `backdrop-filter`, which silently creates a new CSS
 * stacking context, trapping this panel's z-index inside its own card so a
 * later, unrelated ".surface" card on the page can cover it. Portaling to
 * <body> sidesteps that entirely, and also lets the panel flip ABOVE the
 * trigger when there isn't room below (e.g. near the bottom of a modal).
 */
export function SelectPicker({
  label,
  value,
  options,
  onChange,
  placeholder = "Select…",
  otherValue = "Other",
  otherText,
  onOtherTextChange,
}: {
  label: string;
  value: string;
  options: SelectPickerOption[] | string[];
  onChange: (v: string) => void;
  placeholder?: string;
  /** Which option value should trigger the "type your own" box. Defaults to "Other". */
  otherValue?: string;
  /** Current custom text typed for the "Other" option (controlled). */
  otherText?: string;
  /** Called when the custom text is confirmed. Omit to disable custom text entirely. */
  onOtherTextChange?: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editingOther, setEditingOther] = useState(false);
  const [draftOther, setDraftOther] = useState(otherText ?? "");
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

  const normalized: SelectPickerOption[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = normalized.find((o) => o.value === value);
  const supportsOther = !!onOtherTextChange && normalized.some((o) => o.value === otherValue);

  // Close when clicking outside - has to check both the trigger AND the
  // portaled panel, since the panel no longer lives inside containerRef
  // in the DOM tree.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
      setEditingOther(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Position the panel: below the trigger and matching its width by
  // default, but flipped ABOVE it instead whenever there isn't enough room
  // below - otherwise a long options list can run straight off the bottom
  // of the screen with no way to scroll down and reach it.
  useLayoutEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelHeight = panelRef.current?.offsetHeight ?? 260;

      const spaceBelow = window.innerHeight - rect.bottom;
      const fitsBelow = spaceBelow >= panelHeight + GAP;
      const top = fitsBelow ? rect.bottom + GAP : Math.max(VIEWPORT_MARGIN, rect.top - panelHeight - GAP);

      setCoords({ top, left: rect.left, width: rect.width });
    };
    reposition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, editingOther]);

  const pick = (v: string) => {
    if (supportsOther && v === otherValue) {
      setDraftOther(otherText ?? "");
      setEditingOther(true);
      return;
    }
    onChange(v);
    setOpen(false);
  };

  const confirmOther = () => {
    onChange(otherValue);
    onOtherTextChange?.(draftOther.trim());
    setEditingOther(false);
    setOpen(false);
  };

  const triggerLabel =
    value === otherValue && otherText ? `${selected?.label ?? otherValue} — ${otherText}` : selected?.label;

  return (
    <div ref={containerRef} className="relative">
      <label className="field is-filled">
        <button type="button" onClick={() => setOpen((o) => !o)} className="field-trigger">
          {triggerLabel ?? <span className="text-muted-foreground">{placeholder}</span>}
        </button>
        <span className="field-label">{label}</span>
      </label>

      {open &&
        coords &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 100 }}
            className="surface-lift p-1.5 max-h-64 overflow-y-auto"
          >
            {normalized.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o.value)}
                className={cn(
                  "block w-full text-left px-3 py-2 text-sm rounded-md truncate transition hover:bg-muted/60",
                  o.value === value ? "text-emerald" : "text-foreground",
                )}
              >
                {o.value === otherValue && supportsOther ? "Other (type your own)" : o.label}
              </button>
            ))}
            {editingOther && (
              <div className="hairline-t mt-1 pt-1 flex items-center gap-1 p-1">
                <input
                  autoFocus
                  value={draftOther}
                  onChange={(e) => setDraftOther(e.target.value)}
                  placeholder="Please specify…"
                  className="flex-1 bg-transparent border border-border/70 rounded-md px-2.5 py-1.5 text-sm outline-none focus:border-emerald transition"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      confirmOther();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={confirmOther}
                  disabled={!draftOther.trim()}
                  className="p-2 rounded-md hover:bg-emerald/10 text-emerald transition disabled:opacity-40"
                  title="Confirm"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
