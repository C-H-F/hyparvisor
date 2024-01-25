import { useEffect } from 'react';

export function useAsyncEffect(
  effect: () => Promise<unknown>,
  deps: React.DependencyList,
  onUnmount?: () => void
) {
  useEffect(() => {
    effect();
    return onUnmount;
  }, deps);
}
