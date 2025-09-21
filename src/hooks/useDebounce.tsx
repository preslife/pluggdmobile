import { useState, useCallback, useEffect } from 'react';

/**
 * Custom hook to debounce a value
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  const debounceCallback = useCallback(
    (newValue: T) => {
      const timer = setTimeout(() => {
        setDebouncedValue(newValue);
      }, delay);

      return () => clearTimeout(timer);
    },
    [delay]
  );

  // Update debounced value when value or delay changes
  useEffect(() => {
    const cleanup = debounceCallback(value);
    return cleanup;
  }, [value, debounceCallback]);

  return debouncedValue;
}