import { useState, useEffect } from 'react';

export function useIntersection(
  element: React.MutableRefObject<Element | undefined>,
  rootMargin: string
) {
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(entry.isIntersecting);
      },
      { rootMargin }
    );

    element.current && observer.observe(element.current);

    return () => element.current && observer.unobserve(element.current);
  }, []);

  return isVisible;
}
