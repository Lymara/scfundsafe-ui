/**
 * A minimal, dependency-free event bus for "something changed elsewhere in
 * the app, you might want to refetch" signals - the Cash Flow chart on the
 * Dashboard is the first consumer, but any page can subscribe.
 *
 * Why this exists: the Dashboard only fetched its data once, in a mount-time
 * useEffect. Recording an income/expense happens on a different route
 * (Income.tsx / Expenses.tsx), so there was no way for the already-mounted
 * (or previously-mounted, cached) Dashboard to know new data existed short
 * of a full page reload. Emitting an event right after a record is
 * successfully saved lets any subscribed page refetch immediately - whether
 * it's currently visible, sitting in the background, or about to mount.
 */
type Listener = () => void;

const listeners = new Set<Listener>();

/** Subscribe to "records changed" events. Returns an unsubscribe function - call it from a useEffect cleanup. */
export function onRecordsChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Call this right after an income or expense is successfully recorded. */
export function emitRecordsChanged(): void {
  listeners.forEach((listener) => listener());
}
