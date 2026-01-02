import { useCallback, useEffect, useMemo, useRef } from "react";

export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number,
): {
  call: (...args: Parameters<T>) => void;
  cancel: () => void;
  flush: () => void;
} {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);
  const lastCallbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    lastArgsRef.current = null;
  }, []);

  const call = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      lastCallbackRef.current = callbackRef.current;
      lastArgsRef.current = args;
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        const lastArgs = lastArgsRef.current;
        lastArgsRef.current = null;
        if (lastArgs) {
          lastCallbackRef.current(...lastArgs);
        }
      }, delay);
    },
    [delay],
  );

  const flush = useCallback(() => {
    if (!timeoutRef.current) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    const lastArgs = lastArgsRef.current;
    lastArgsRef.current = null;
    if (lastArgs) {
      lastCallbackRef.current(...lastArgs);
    }
  }, []);

  useEffect(() => cancel, [cancel]);

  return useMemo(() => ({ call, cancel, flush }), [call, cancel, flush]);
}
