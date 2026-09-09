import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SectionNavItem<T extends string> {
  key: T;
  label: string;
  icon: LucideIcon;
}

/**
 * A horizontal top nav, styled to match the app's main sidebar rail (same
 * icon + is-active treatment), used to switch between a page's sub-views
 * (e.g. Record Expense / Fees & Sources / Edit Expenses).
 */
export function SectionNav<T extends string>({
  items,
  active,
  onChange,
}: {
  items: SectionNavItem<T>[];
  active: T;
  onChange: (key: T) => void;
}) {
  if (items.length < 2) return null;

  return (
    <nav className="section-nav surface p-2 flex flex-wrap items-center gap-1 w-fit">
      {items.map(({ key, label, icon: Icon }) => {
        const isActive = key === active;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={cn("rail-item shrink-0 text-left", isActive && "is-active")}
          >
            <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-yellow-400")} />
            <span className="flex-1 whitespace-nowrap">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
