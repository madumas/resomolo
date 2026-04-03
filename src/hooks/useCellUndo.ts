import { useState } from 'react';

export function useCellUndo(maxLevels = 20) {
  const [stack, setStack] = useState<{ cellId: string; prevValue: string }[]>([]);

  const push = (cellId: string, prevValue: string) => {
    setStack(prev => [...prev.slice(-(maxLevels - 1)), { cellId, prevValue }]);
  };

  const pop = (): { cellId: string; prevValue: string } | null => {
    if (stack.length === 0) return null;
    const entry = stack[stack.length - 1];
    setStack(prev => prev.slice(0, -1));
    return entry;
  };

  return { push, pop, canUndo: stack.length > 0 };
}
