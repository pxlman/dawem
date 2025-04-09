// hooks/useDebouncedEffect.ts
import { useEffect, useRef, DependencyList } from 'react';

// Add types for parameters
export function useDebouncedEffect(
    callback: () => void,
    deps: DependencyList,
    delay: number
): void {
  // const firstUpdate = useRef(true); // Keep if needed to skip first render
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // Type the ref for setTimeout handle

  useEffect(() => {
    // Optional: Skip effect on initial mount
    // if (firstUpdate.current) {
    //   firstUpdate.current = false;
    //   return;
    // }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback();
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // Include callback and delay in the dependency array as they can change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay, callback]);
}