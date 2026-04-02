import { useState, useEffect, type RefObject } from 'react';

export function useContainerSize(ref: RefObject<HTMLElement | null>): { width: number; height: number } {
  const [size, setSize] = useState({ width: 800, height: 400 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) {
        setSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    observer.observe(el);
    // Initial measurement
    setSize({ width: el.clientWidth, height: el.clientHeight });

    return () => observer.disconnect();
  }, [ref]);

  return size;
}
