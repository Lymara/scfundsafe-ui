import { useState } from "react";

/** Password input with a press-and-hold eye button.
 *  Hold the eye to reveal, release to hide. */
export function PwInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (s: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const reveal = () => setShow(true);
  const hide = () => setShow(false);

  return (
    <span className="relative block">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        style={{ paddingRight: "2.25rem" }}
      />
      <button
        type="button"
        tabIndex={-1}
        onMouseDown={reveal}
        onMouseUp={hide}
        onMouseLeave={hide}
        onTouchStart={(e) => {
          e.preventDefault();
          reveal();
        }}
        onTouchEnd={hide}
        onTouchCancel={hide}
        onBlur={hide}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition select-none"
        aria-label={show ? "Password visible — release to hide" : "Hold to show password"}
      >
        <EyeGlyph className="h-4 w-4" />
      </button>
    </span>
  );
}

export function EyeGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 12c2.5-4.5 5.75-6.75 9-6.75S18.5 7.5 21 12" />
      <circle cx="12" cy="13.25" r="3.25" />
    </svg>
  );
}
