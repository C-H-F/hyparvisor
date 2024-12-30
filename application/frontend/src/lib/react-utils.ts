import { useEffect } from 'react';

export function useAsyncEffect(
  effect: () => Promise<unknown>,
  deps: React.DependencyList,
  onUnmount?: () => void
) {
  useEffect(() => {
    runEffect();
    return onUnmount;
  }, deps);
  async function runEffect() {
    try {
      await effect();
    } catch (e) {
      window.dispatchEvent(new ErrorEvent('error', { error: e }));
    }
  }
}

/**
 * Starts an interval that will be started and stopped automatically through useEffect.
 * @param handler The function to call when the timer elapses.
 * @param delay The number of milliseconds to wait before calling the `callback`.
 * @param args Optional arguments to pass when the `callback` is called.
 * @returns A function that can be used to clear the interval.
 */
export function useInterval<T extends unknown[]>(
  handler: (...args: T) => void,
  delay: number,
  ...args: T
) {
  let handle: ReturnType<typeof setInterval>;
  const stop = () => clearInterval(handle);
  useEffect(
    () => {
      handle = setInterval(
        async (args) => {
          try {
            await handler(...args);
          } catch (e) {
            window.dispatchEvent(new ErrorEvent('error', { error: e }));
          }
        },
        delay,
        args
      );
      return stop;
    },
    args ? [...args] : []
  );
  return stop;
}
