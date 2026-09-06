import { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Pulls a best-guess reference/transaction number out of raw OCR text.
 * Receipts vary a lot, so this tries a few strategies in order of
 * confidence rather than assuming one fixed format:
 *   1. A line that actually says "Ref"/"Reference"/"Transaction" near a
 *      number - the strongest signal, since it's explicitly labeled.
 *   2. Otherwise, the longest digit run anywhere in the text - GCash/
 *      PayMaya/bank reference numbers are usually the longest number on
 *      the receipt.
 * Either way, reference numbers are frequently printed in grouped chunks
 * for readability (e.g. "3731 3309 1234" or "3731-3309-1234"). Matching
 * only unbroken alphanumeric runs would grab just one chunk and silently
 * drop the rest, so both strategies capture the full space/hyphen-
 * separated run and strip the separators back out afterward, rather than
 * treating each chunk as a separate candidate.
 * This is a best-effort guess, not a guarantee - the field stays editable
 * so the treasurer can fix it if the scan gets it wrong.
 */
export function extractReferenceNumber(rawText: string): string | null {
  const lines = rawText.split(/\r?\n/);
  for (const line of lines) {
    const labeled = line.match(/(?:ref(?:erence)?|trans(?:action)?)[\s.:#\-no]*[:\-]?\s*([A-Za-z0-9](?:[A-Za-z0-9\s\-]{3,26}[A-Za-z0-9])?)/i);
    if (labeled) {
      // Stop at the first "space + a recognizable word" - a real code
      // rarely has a space directly followed by 2+ letters, but natural
      // language trailing on the same line always does (e.g. the OCR text
      // "1234 Paid via GCash" should only keep "1234", not the rest).
      const stopped = labeled[1].match(/^(.*?)\s[A-Za-z]{2,}\b/);
      const raw = stopped ? stopped[1] : labeled[1];
      const cleaned = raw.replace(/[\s\-]/g, "");
      if (cleaned.length >= 5) return cleaned;
    }
  }

  // Fallback: every run of digits that may be grouped with spaces/hyphens,
  // plus plain alphanumeric tokens for references that mix in letters.
  const grouped = (rawText.match(/\d[\d\s\-]{4,}\d/g) ?? []).map((g) => g.replace(/[\s\-]/g, ""));
  const tokens = (rawText.match(/[A-Za-z0-9\-]{6,}/g) ?? []).map((t) => t.replace(/-/g, ""));
  const candidates = [...grouped, ...tokens];
  if (candidates.length === 0) return null;

  const digitCount = (t: string) => (t.match(/\d/g) ?? []).length;
  let best: string = candidates[0]!;
  for (const t of candidates) {
    // Prefer more digits; on a tie, prefer the longer overall string - an
    // alphanumeric token that CONTAINS a pure-digit match (e.g.
    // "ABC123456789" vs. just "123456789" found separately) is the more
    // complete answer, not a different candidate.
    if (digitCount(t) > digitCount(best) || (digitCount(t) === digitCount(best) && t.length > best.length)) {
      best = t;
    }
  }
  return best;
}

export function ReferenceNumberField({
  label = "Reference number",
  value,
  onChange,
  placeholder = "REF-000123",
  required = false,
  onFileCaptured,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Fires with the photo the treasurer picked, once scanning finishes (success or not) - lets the
   * parent form hold onto it and attach it to the payment once that payment actually exists. */
  onFileCaptured?: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  const scanFile = async (file: File) => {
    setScanning(true);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      try {
        const { data } = await worker.recognize(file);
        const found = extractReferenceNumber(data.text);
        if (found) {
          onChange(found);
          toast.success(`Scanned reference number: ${found}`, {
            description: "Double-check it against the photo before saving.",
          });
        } else {
          toast.error("Couldn't find a reference number in that photo - enter it manually.");
        }
      } finally {
        await worker.terminate();
      }
    } catch {
      toast.error("Scan failed - enter the reference number manually.");
    } finally {
      setScanning(false);
      onFileCaptured?.(file);
    }
  };

  return (
    <label className={"field" + (value ? " is-filled" : "")}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={50}
        placeholder={placeholder}
        required={required}
        style={{ paddingRight: "2.25rem" }}
      />
      <span className="field-label">{label}</span>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) scanFile(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={scanning}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition disabled:opacity-50"
        title="Scan reference number from a photo"
        aria-label="Attach a photo to scan the reference number"
      >
        {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
      </button>
    </label>
  );
}
