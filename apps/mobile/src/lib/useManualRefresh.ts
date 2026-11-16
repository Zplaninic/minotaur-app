import { useState } from "react";

// For a list's pull-to-refresh: the spinner shows only for a refresh the
// person pulled, not for every refetch in the background.
export const useManualRefresh = (
  refetch: () => Promise<unknown>,
): { refreshing: boolean; onRefresh: () => void } => {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    void refetch().finally(() => setRefreshing(false));
  };
  return { refreshing, onRefresh };
};
