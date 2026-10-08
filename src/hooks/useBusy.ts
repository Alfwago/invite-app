import { useCallback, useRef, useState } from "react";

/**
 * Guards async button actions against a double tap: `run("save", fn)` does
 * nothing while a "save" is already running, and `isBusy("save")` lets the
 * button show a spinner / go inert meanwhile. The ref is checked synchronously,
 * so a second tap that lands before the re-render is still refused.
 */
export function useBusy() {
  const running = useRef(new Set<string>());
  const [, rerender] = useState(0);

  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>): Promise<T | undefined> => {
    if (running.current.has(key)) return undefined;
    running.current.add(key);
    rerender((n) => n + 1);
    try {
      return await fn();
    } finally {
      running.current.delete(key);
      rerender((n) => n + 1);
    }
  }, []);

  const isBusy = useCallback((key: string) => running.current.has(key), []);

  return { run, isBusy };
}
