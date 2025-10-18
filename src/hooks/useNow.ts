import { useEffect, useState } from "react";

/**
 * Returns a Date object that refreshes on the provided interval. Useful for
 * realtime countdowns without reimplementing interval logic in every component.
 */
export const useNow = (refreshMs = 60_000) => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, refreshMs);

    return () => {
      clearInterval(interval);
    };
  }, [refreshMs]);

  return now;
};

export default useNow;
