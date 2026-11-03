import { useEffect, useState } from "react";

/** Search delay used across the admin panel: the value settles this long after the last keystroke. */
export const SEARCH_DEBOUNCE_MS = 400;

/**
 * `value` once it has stopped changing for `delayMs`. The input keeps showing
 * every keystroke; only what filters or fetches waits, so typing a name runs
 * one search instead of one per letter.
 */
export function useDebouncedValue<T>(value: T, delayMs = SEARCH_DEBOUNCE_MS): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return settled;
}
