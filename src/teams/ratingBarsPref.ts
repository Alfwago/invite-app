import { useEffect, useSyncExternalStore } from "react";
import * as SecureStore from "expo-secure-store";

// "Rating bars" on the Team Generator (owner 2026-11-19): on unless turned
// off, remembered on this phone. Same idea as the "Vibration on tap" setting.

const KEY = "obh.teams.ratingBars";
let on = true;
let loaded = false;
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) fn();
}

/** [shown, set]. The saved choice loads the first time a screen uses it. */
export function useRatingBarsPref(): [boolean, (value: boolean) => void] {
  const value = useSyncExternalStore(subscribe, () => on);
  useEffect(() => {
    if (loaded) return;
    loaded = true;
    SecureStore.getItemAsync(KEY)
      .then((raw) => {
        if (raw === "0") {
          on = false;
          emit();
        }
      })
      .catch(() => {});
  }, []);
  return [
    value,
    (next: boolean) => {
      on = next;
      emit();
      SecureStore.setItemAsync(KEY, next ? "1" : "0").catch(() => {});
    },
  ];
}
