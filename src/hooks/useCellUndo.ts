import { useRef, useState } from 'react';

export function useCellUndo(maxLevels = 20) {
  const stackRef = useRef<{ cellId: string; prevValue: string }[]>([]);
  const [, forceUpdate] = useState(0); // trigger re-render for canUndo

  const push = (cellId: string, prevValue: string) => {
    stackRef.current = [...stackRef.current.slice(-(maxLevels - 1)), { cellId, prevValue }];
    forceUpdate(n => n + 1);
  };

  const pop = (): { cellId: string; prevValue: string } | null => {
    if (stackRef.current.length === 0) return null;
    const entry = stackRef.current[stackRef.current.length - 1];
    stackRef.current = stackRef.current.slice(0, -1);
    forceUpdate(n => n + 1);
    return entry;
  };

  return { push, pop, canUndo: stackRef.current.length > 0 };
}
