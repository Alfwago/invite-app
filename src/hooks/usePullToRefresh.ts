import { useCallback, useState } from "react";

/**
 * Pull-to-refresh state that's only on while the user's own pull is loading.
 *
 * Binding a RefreshControl to a query's `isRefetching` also shows the spinner
 * for every background refetch (a save invalidating the query, polling,
 * coming back to the foreground) — and on iOS that spinner pushes the whole
 * scroll view down, shifting whatever was under the user's finger.
 */
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);
  return { refreshing, onRefresh };
}
