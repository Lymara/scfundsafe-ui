import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectPickerOption {
  value: string;
  label: string;
}

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

  const normalized: SelectPickerOption[] = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const selected = normalized.find((o) => o.value === value);
  const supportsOther = !!onOtherTextChange && normalized.some((o) => o.value === otherValue);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setEditingOther(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

      {open && (
        <div className="absolute z-20 mt-1 w-full surface-lift p-1.5 max-h-64 overflow-y-auto">
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
        </div>
      )}
    </div>
  );
}
