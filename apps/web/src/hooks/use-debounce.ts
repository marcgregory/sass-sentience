/**
 * Debounce a value — returns the debounced value that only updates
 * after `delay` ms of inactivity.
 *
 * Use for search inputs that drive API queries to avoid firing
 * a request on every keystroke.
 */

import { useState, useEffect } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
