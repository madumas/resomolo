import { useState, useEffect } from 'react';

const MOBILE_QUERY = '(max-width: 500px) and (orientation: portrait)';

export function useViewport() {
  const [isMobilePortrait, setIsMobilePortrait] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const handler = (e: MediaQueryListEvent) => setIsMobilePortrait(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return { isMobilePortrait };
}
