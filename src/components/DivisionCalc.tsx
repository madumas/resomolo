import React, { useState, useRef, useEffect, useCallback } from 'react';
import { onSnap } from '../engine/sound';

export interface DivisionCalcData {
  type: 'division';
  dividend: string[];      // digits of dividend (6 cells)
  divisor: string[];       // digits of divisor (3 cells)
  quotient: string[];      // digits of quotient (6 cells)
  remainder: string;       // final remainder (1-2 digits)
  steps: DivisionStep[];   // variable number of division steps
  decimalPos?: number | null; // null=integer, 1=dixièmes, 2=centièmes — applies to dividend AND quotient
}

interface DivisionStep {
  product: string[];       // product partial (6 cells)
  partialRemainder: string[]; // remainder after subtraction (6 cells)
}

interface DivisionCalcProps {
  left: number;
  top: number;
  initialDividend?: string;
  initialDivisor?: string;
  savedData?: DivisionCalcData;
  onCommit: (expression: string, data: DivisionCalcData) => void;
  onCancel: () => void;
}

const DIV_COLS = 6;     // dividend/quotient columns
const DIVISOR_COLS = 3; // divisor columns
const CELL = 48;
const GAP = 4;
const MAX_STEPS = 4;

type Row = string[];

function emptyRow(n: number): Row {
  return Array(n).fill('');
}

export function detectDecimalPosition(num: string | undefined): number | null {
  if (!num) return null;
  const match = num.match(/[,.](\d+)$/);
  return match ? match[1].length : null;
}

export function numToRow(num: string | undefined, cols: number, decimalPos?: number | null): Row {
  if (!num) return emptyRow(cols);
  if (decimalPos) {
    const parts = num.split(/[,.]/);
    const intPart = parts[0] || '';
    const decPart = parts[1] || '';
    const row = emptyRow(cols);
    const intStart = cols - decimalPos - intPart.length;
    for (let i = 0; i < intPart.length; i++) {
      const idx = intStart + i;
      if (idx >= 0 && idx < cols) row[idx] = intPart[i];
    }
    const decStart = cols - decimalPos;
    for (let i = 0; i < decPart.length; i++) {
      if (decStart + i < cols) row[decStart + i] = decPart[i];
    }
    return row;
  }
  // Integer mode: strip non-digits, right-align
  const digits = num.replace(/[^0-9]/g, '').split('');
  const row = emptyRow(cols);
  for (let i = 0; i < digits.length && i < cols; i++) {
    row[cols - 1 - i] = digits[digits.length - 1 - i];
  }
  return row;
}

function rowToNum(row: Row): string {
  return row.join('').replace(/^0+/, '') || '0';
}

export function rowToNumWithDecimal(row: Row, decPos: number | null, cols: number): string {
  if (decPos === null || decPos === 0) {
    return row.join('').replace(/^0+/, '') || '0';
  }
  const intCells = row.slice(0, cols - decPos);
  const decCells = row.slice(cols - decPos);
  const intPart = intCells.join('').replace(/^0+/, '') || '0';
  const decPart = decCells.join('');
  if (!decPart) return intPart;
  return `${intPart},${decPart}`;
}

function emptyStep(): DivisionStep {
  return {
    product: emptyRow(DIV_COLS),
    partialRemainder: emptyRow(DIV_COLS),
  };
}

export function DivisionCalc({ left, top: _top, initialDividend, initialDivisor, savedData, onCommit, onCancel }: DivisionCalcProps) {
  const initialDecPos = savedData?.decimalPos !== undefined ? savedData.decimalPos : (detectDecimalPosition(initialDividend) ?? detectDecimalPosition(initialDivisor));
  const [decimalPos, setDecimalPos] = useState<number | null>(initialDecPos);
  const [decimalLocked, setDecimalLocked] = useState(
    () => initialDecPos !== null && initialDecPos !== undefined
      && !!savedData?.quotient?.some(d => d !== '')
  );
  const [dividend, setDividend] = useState<Row>(savedData?.dividend || numToRow(initialDividend, DIV_COLS, initialDecPos));
  const [divisor, setDivisor] = useState<Row>(savedData?.divisor || numToRow(initialDivisor, DIVISOR_COLS, initialDecPos));
  const [quotient, setQuotient] = useState<Row>(savedData?.quotient || emptyRow(DIV_COLS));
  const [remainder, setRemainder] = useState(savedData?.remainder || '');
  const [steps, setSteps] = useState<DivisionStep[]>(savedData?.steps || [emptyStep()]);
  const [lastModified, setLastModified] = useState<{ cellId: string; prevValue: string } | null>(null);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    setTimeout(() => {
      // If saved data exists, focus quotient (continuing work)
      // Otherwise focus rightmost dividend cell (start entering dividend)
      const hasData = savedData && (savedData.dividend.some(d => d !== '') || savedData.divisor.some(d => d !== ''));
      if (hasData) {
        const ref = cellRefs.current.get(`quotient-0`);
        ref?.focus();
      } else {
        const ref = cellRefs.current.get(`dividend-${DIV_COLS - 1}`);
        ref?.focus();
      }
    }, 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCellRef = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const focusCell = (name: string) => {
    const el = cellRefs.current.get(name) || document.querySelector<HTMLInputElement>(`[data-cell="${name}"]`);
    el?.focus();
  };

  const applyValueToCell = (cellId: string, value: string) => {
    const parts = cellId.split('-');
    const rowName = parts[0];
    // Handle step cells like "step0-product-4" or "step0-remainder-3"
    if (rowName.startsWith('step')) {
      const stepIdx = parseInt(rowName.replace('step', ''));
      const field = parts[1] as 'product' | 'remainder';
      const col = parseInt(parts[parts.length - 1]);
      const stepField = field === 'remainder' ? 'partialRemainder' : 'product';
      setSteps(prev => {
        const copy = prev.map(s => ({
          product: [...s.product],
          partialRemainder: [...s.partialRemainder],
        }));
        if (copy[stepIdx]) copy[stepIdx][stepField][col] = value;
        return copy;
      });
    } else {
      if (rowName === 'remainder') {
        setRemainder(value);
      } else {
        const col = parseInt(parts[parts.length - 1]);
        if (rowName === 'dividend') setDividend(prev => { const n = [...prev]; n[col] = value; return n; });
        else if (rowName === 'divisor') setDivisor(prev => { const n = [...prev]; n[col] = value; return n; });
        else if (rowName === 'quotient') setQuotient(prev => { const n = [...prev]; n[col] = value; return n; });
      }
    }
  };

  const handleOups = () => {
    if (!lastModified) return;
    applyValueToCell(lastModified.cellId, lastModified.prevValue);
    focusCell(lastModified.cellId);
    setLastModified(null);
    onSnap();
  };

  const changeDecimalPos = (newDecPos: number | null) => {
    if (decimalLocked) return;
    const oldDecPos = decimalPos ?? 0;
    const newDec = newDecPos ?? 0;
    const shift = newDec - oldDecPos;
    if (shift !== 0) {
      const shiftRow = (row: Row): Row => {
        if (shift > 0) return [...row.slice(shift), ...Array(shift).fill('')];
        return [...Array(-shift).fill(''), ...row.slice(0, shift)];
      };
      setDividend(shiftRow);
      setDivisor(shiftRow);
      setQuotient(shiftRow);
      setSteps(prev => prev.map(s => ({
        product: shiftRow(s.product),
        partialRemainder: shiftRow(s.partialRemainder),
      })));
    }
    setDecimalPos(newDecPos);
    setLastModified(null);
  };

  const handleCellChange = (
    row: Row,
    setRow: ((r: Row) => void) | null,
    rowName: string,
    col: number,
    value: string,
    stepIdx?: number,
    stepField?: 'product' | 'partialRemainder',
  ) => {
    // Save previous value for undo
    setLastModified({ cellId: `${rowName}-${col}`, prevValue: row[col] });
    const normalized = value.replace(/,/g, '.');
    const digit = normalized.replace(/[^0-9]/g, '').slice(-1);
    const next = [...row];
    next[col] = digit;

    // Lock decimal selector once user types in quotient
    if (rowName === 'quotient' && digit && decimalPos !== null && !decimalLocked) {
      setDecimalLocked(true);
    }

    if (stepIdx !== undefined && stepField) {
      setSteps(prev => {
        const copy = prev.map(s => ({
          product: [...s.product],
          partialRemainder: [...s.partialRemainder],
        }));
        copy[stepIdx][stepField] = next;
        return copy;
      });
    } else if (setRow) {
      setRow(next);
    }

    // Auto-advance: left to right
    if (digit && col < (rowName === 'divisor' ? DIVISOR_COLS : DIV_COLS) - 1) {
      setTimeout(() => {
        const nextRef = cellRefs.current.get(`${rowName}-${col + 1}`);
        nextRef?.focus();
        nextRef?.select();
      }, 0);
    }
  };

  const handleRemainderChange = (value: string) => {
    setLastModified({ cellId: 'remainder', prevValue: remainder });
    const digit = value.replace(/[^0-9]/g, '').slice(0, 2);
    setRemainder(digit);
  };

  // Build the ordered list of all row names for vertical navigation
  // Quebec crochet: dividend on top-left, steps below; divisor top-right, quotient below
  const allRowNames = (): string[] => {
    const rows: string[] = ['dividend', 'divisor', 'quotient'];
    for (let i = 0; i < steps.length; i++) {
      rows.push(`step${i}-product`);
      rows.push(`step${i}-remainder`);
    }
    return rows;
  };

  const handleKeyDown = (rowName: string, col: number, e: React.KeyboardEvent, maxCols?: number) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      e.stopPropagation();
      handleOups();
      return;
    }
    const cols = maxCols || (rowName === 'divisor' ? DIVISOR_COLS : DIV_COLS);

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (col < cols - 1) focusCell(`${rowName}-${col + 1}`);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (col > 0) focusCell(`${rowName}-${col - 1}`);
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const rows = allRowNames();
      const idx = rows.indexOf(rowName);
      const nextIdx = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < rows.length) {
        focusCell(`${rows[nextIdx]}-${col}`);
      }
    }
    if (e.key === 'Backspace' && !((e.target as HTMLInputElement).value)) {
      e.preventDefault();
      if (col > 0) focusCell(`${rowName}-${col - 1}`);
    }
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  const handleRemainderKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      e.stopPropagation();
      handleOups();
      return;
    }
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      // Go to last quotient cell
      focusCell(`quotient-${DIV_COLS - 1}`);
    }
  };

  const addStep = () => {
    if (steps.length < MAX_STEPS) {
      setSteps(prev => [...prev, emptyStep()]);
    }
  };

  const removeStep = () => {
    if (steps.length > 1) {
      setSteps(prev => prev.slice(0, -1));
    }
  };

  const commit = () => {
    const dividendStr = decimalPos !== null ? rowToNumWithDecimal(dividend, decimalPos, DIV_COLS) : rowToNum(dividend);
    const divisorStr = decimalPos !== null ? rowToNumWithDecimal(divisor, decimalPos, DIVISOR_COLS) : rowToNum(divisor);
    const quotientStr = decimalPos !== null ? rowToNumWithDecimal(quotient, decimalPos, DIV_COLS) : rowToNum(quotient);
    // J4: don't commit "0 ÷ 0 = 0" for empty grids
    const dividendRaw = rowToNum(dividend);
    const divisorRaw = rowToNum(divisor);
    if (divisorRaw === '0' || dividendRaw === '0') {
      const data: DivisionCalcData = {
        type: 'division',
        dividend: [...dividend],
        divisor: [...divisor],
        quotient: [...quotient],
        remainder,
        steps: steps.map(s => ({
          product: [...s.product],
          partialRemainder: [...s.partialRemainder],
        })),
        decimalPos,
      };
      onCommit('', data);
      return;
    }
    const expr = remainder && remainder !== '0' && remainder !== ''
      ? `${dividendStr} ÷ ${divisorStr} = ${quotientStr} R ${remainder}`
      : `${dividendStr} ÷ ${divisorStr} = ${quotientStr}`;
    const data: DivisionCalcData = {
      type: 'division',
      dividend: [...dividend],
      divisor: [...divisor],
      quotient: [...quotient],
      remainder,
      steps: steps.map(s => ({
        product: [...s.product],
        partialRemainder: [...s.partialRemainder],
      })),
      decimalPos,
    };
    onCommit(expr, data);
  };

  // Width calculations
  const decSepWidth = decimalPos !== null ? 16 + GAP : 0; // decimal separator width + gap
  const dividendWidth = DIV_COLS * (CELL + GAP) - GAP + decSepWidth;
  const bracketWidth = 3; // vertical bar thickness
  const bracketGap = 8;   // gap around bracket
  const minusColWidth = CELL / 2; // width for the "−" sign column

  return (
    <div
      style={{
        position: 'absolute', left: Math.max(8, left), top: 8,
        background: '#fff', border: '2px solid #7028e0',
        borderRadius: 10, padding: 16,
        maxHeight: 'calc(100% - 16px)', overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 20,
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div style={{ fontSize: 13, color: '#7028e0', fontWeight: 600, marginBottom: 10 }}>
        Division à crochet
      </div>

      {/* Decimal mode selector */}
      <div style={{ display: 'flex', gap: GAP, marginBottom: 8 }}>
        {([null, 1, 2] as const).map(dp => (
          <button key={String(dp)} onClick={() => changeDecimalPos(dp)}
            disabled={decimalLocked}
            style={{
              ...decBtnStyle,
              ...(decimalPos === dp ? decBtnActiveStyle : {}),
              ...(decimalLocked ? { opacity: 0.5, cursor: 'default' } : {}),
            }}>
            {dp === null ? 'Entier' : dp === 1 ? 'dixièmes' : 'centièmes'}
          </button>
        ))}
      </div>

      {/* Two-column layout: LEFT (dividend + steps) | bracket | RIGHT (divisor + quotient) */}
      <div style={{ display: 'flex', gap: 0 }}>

        {/* LEFT ZONE: dividend + subtraction steps */}
        <div>
          {/* Dividend row */}
          <div style={{ display: 'flex', gap: GAP, marginBottom: GAP }}>
            {dividend.map((d, col) => (
              <React.Fragment key={`dividend-${col}`}>
                {decimalPos !== null && col === DIV_COLS - decimalPos && (
                  <span style={decimalSepStyle}>,</span>
                )}
                <CellInput
                  cellId={`dividend-${col}`}
                  refCb={el => setCellRef(`dividend-${col}`, el)}
                  value={d}
                  onChange={v => handleCellChange(dividend, setDividend, 'dividend', col, v)}
                  onKeyDown={e => handleKeyDown('dividend', col, e)}
                  colIdx={col}
                />
              </React.Fragment>
            ))}
          </div>

          {/* Steps (products + remainders) — last step highlighted as active */}
          {steps.map((step, stepIdx) => (
            <div key={`step-${stepIdx}`} style={{
              background: stepIdx === steps.length - 1 ? '#F5F0FF' : 'transparent',
              borderRadius: stepIdx === steps.length - 1 ? 6 : 0,
              padding: stepIdx === steps.length - 1 ? '4px 2px' : 0,
              margin: stepIdx === steps.length - 1 ? '-4px -2px' : 0,
              transition: 'background 0.2s',
            }}>
              {/* Product with "−" sign */}
              <div style={{ display: 'flex', gap: GAP, marginBottom: GAP, alignItems: 'center' }}>
                <div style={{ width: minusColWidth, textAlign: 'center', fontSize: 18, color: '#55506A', fontFamily: 'monospace', fontWeight: 600, flexShrink: 0 }}>−</div>
                {step.product.map((d, col) => (
                  <React.Fragment key={`step${stepIdx}-product-${col}`}>
                    {decimalPos !== null && col === DIV_COLS - decimalPos && (
                      <span style={{ ...decimalSepStyle, visibility: 'hidden' }}>,</span>
                    )}
                    <CellInput
                      cellId={`step${stepIdx}-product-${col}`}
                      refCb={el => setCellRef(`step${stepIdx}-product-${col}`, el)}
                      value={d}
                      onChange={v => handleCellChange(step.product, null, `step${stepIdx}-product`, col, v, stepIdx, 'product')}
                      onKeyDown={e => handleKeyDown(`step${stepIdx}-product`, col, e)}
                      colIdx={col}
                    />
                  </React.Fragment>
                ))}
              </div>

              {/* Separator line */}
              <div style={{ borderTop: '1px solid #9CA3AF', marginLeft: minusColWidth + GAP, width: dividendWidth, marginTop: GAP, marginBottom: GAP }} />

              {/* Partial remainder */}
              <div style={{ display: 'flex', gap: GAP, marginBottom: GAP }}>
                <div style={{ width: minusColWidth, flexShrink: 0 }} /> {/* spacer for "−" column */}
                {step.partialRemainder.map((d, col) => (
                  <React.Fragment key={`step${stepIdx}-remainder-${col}`}>
                    {decimalPos !== null && col === DIV_COLS - decimalPos && (
                      <span style={{ ...decimalSepStyle, visibility: 'hidden' }}>,</span>
                    )}
                    <CellInput
                      cellId={`step${stepIdx}-remainder-${col}`}
                      refCb={el => setCellRef(`step${stepIdx}-remainder-${col}`, el)}
                      value={d}
                      onChange={v => handleCellChange(step.partialRemainder, null, `step${stepIdx}-remainder`, col, v, stepIdx, 'partialRemainder')}
                      onKeyDown={e => handleKeyDown(`step${stepIdx}-remainder`, col, e)}
                      colIdx={col}
                    />
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}

          {/* Add/remove step buttons */}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {steps.length < MAX_STEPS && (
              <button onClick={addStep} style={addStepBtnStyle}>
                + Ajouter une étape
              </button>
            )}
            {steps.length > 1 && (
              <button onClick={removeStep} style={{ ...addStepBtnStyle, color: '#9CA3AF', borderColor: '#D5D0E0' }}>
                − Retirer
              </button>
            )}
          </div>
        </div>

        {/* BRACKET: vertical bar */}
        <div style={{
          width: bracketWidth,
          background: '#1E1A2E',
          marginLeft: bracketGap,
          marginRight: bracketGap,
          borderRadius: 1,
          alignSelf: 'stretch',
        }} />

        {/* RIGHT ZONE: divisor + horizontal bar + quotient */}
        <div>
          {/* Divisor */}
          <div style={{ display: 'flex', gap: GAP, marginBottom: 0 }}>
            {divisor.map((d, col) => (
              <React.Fragment key={`divisor-${col}`}>
                {decimalPos !== null && col === DIVISOR_COLS - decimalPos && (
                  <span style={decimalSepStyle}>,</span>
                )}
                <CellInput
                  cellId={`divisor-${col}`}
                  refCb={el => setCellRef(`divisor-${col}`, el)}
                  value={d}
                  onChange={v => handleCellChange(divisor, setDivisor, 'divisor', col, v)}
                  onKeyDown={e => handleKeyDown('divisor', col, e, DIVISOR_COLS)}
                  colIdx={col}
                />
              </React.Fragment>
            ))}
          </div>

          {/* Horizontal bar (top of bracket, under divisor, above quotient) */}
          <div style={{ borderTop: '3px solid #1E1A2E', marginTop: GAP, marginBottom: GAP }} />

          {/* Quotient + R + remainder */}
          <div style={{ display: 'flex', gap: GAP, alignItems: 'center' }}>
            {quotient.map((d, col) => (
              <React.Fragment key={`quotient-${col}`}>
                {decimalPos !== null && col === DIV_COLS - decimalPos && (
                  <span style={decimalSepStyle}>,</span>
                )}
                <CellInput
                  cellId={`quotient-${col}`}
                  refCb={el => setCellRef(`quotient-${col}`, el)}
                  value={d}
                  onChange={v => handleCellChange(quotient, setQuotient, 'quotient', col, v)}
                  onKeyDown={e => handleKeyDown('quotient', col, e)}
                  bold
                  colIdx={col}
                />
              </React.Fragment>
            ))}
            {/* Remainder label and input — hidden in decimal mode */}
            {decimalPos === null && (<>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#55506A', marginLeft: 8, fontFamily: 'monospace' }}>R</span>
            <input
              ref={el => setCellRef('remainder', el)}
              data-cell="remainder"
              type="text" inputMode="decimal" maxLength={2}
              value={remainder}
              onChange={e => handleRemainderChange(e.target.value)}
              onKeyDown={handleRemainderKeyDown}
              onFocus={e => e.target.select()}
              style={{
                width: CELL * 1.2, height: CELL, fontSize: 28,
                fontWeight: 700, textAlign: 'center',
                border: '2px solid #D5D0E0', borderRadius: 6,
                fontFamily: "'Consolas', 'Courier New', monospace",
                outline: 'none', background: '#FAFCFF',
              }}
            />
            </>)}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        <button
          onClick={handleOups}
          disabled={!lastModified}
          title="Effacer la dernière modification"
          style={{
            minWidth: 48, minHeight: 48, borderRadius: 8,
            background: lastModified ? '#F3F0FA' : '#F5F5F5',
            border: `1px solid ${lastModified ? '#D5D0E0' : '#E5E5E5'}`,
            cursor: lastModified ? 'pointer' : 'default',
            color: lastModified ? '#55506A' : '#CCCCCC',
            display: 'flex', flexDirection: 'column' as const,
            alignItems: 'center', justifyContent: 'center', gap: 1,
          }}
        >
          <span style={{ fontSize: 16 }}>↶</span>
          <span style={{ fontSize: 11 }}>Oups</span>
        </button>
        <button onClick={onCancel} style={btnStyle}>Fermer</button>
        <button onClick={commit} style={{ ...btnStyle, background: '#7028e0', color: '#fff', border: 'none' }}>Valider</button>
      </div>
    </div>
  );
}

function CellInput({ value, onChange, onKeyDown, refCb, bold, cellId, colIdx }: {
  value: string; onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  refCb: (el: HTMLInputElement | null) => void; bold?: boolean;
  cellId?: string; colIdx?: number;
}) {
  const isEvenCol = colIdx !== undefined && colIdx % 2 === 1;
  return (
    <input ref={refCb} type="text" inputMode="decimal" maxLength={1}
      data-cell={cellId}
      value={value} onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown} onFocus={e => e.target.select()}
      style={{
        width: CELL, height: CELL, fontSize: 28,
        fontWeight: bold ? 700 : 400, textAlign: 'center',
        border: '2px solid #D5D0E0', borderRadius: 6,
        fontFamily: "'Consolas', 'Courier New', monospace",
        outline: 'none',
        background: isEvenCol ? 'rgba(0,0,0,0.02)' : '#FAFCFF',
      }} />
  );
}

const btnStyle: React.CSSProperties = {
  padding: '10px 20px', fontSize: 14, border: '1px solid #D5D0E0',
  borderRadius: 6, background: '#F6F4FA', cursor: 'pointer', minHeight: 44,
};

const addStepBtnStyle: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, border: '1px dashed #7028e0',
  borderRadius: 6, background: '#EBF0F9', cursor: 'pointer', minHeight: 44,
  color: '#7028e0', fontWeight: 500,
};

const decimalSepStyle: React.CSSProperties = {
  width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 24, fontWeight: 700, color: '#1E1A2E', fontFamily: 'monospace',
};

const decBtnStyle: React.CSSProperties = {
  padding: '6px 12px', fontSize: 13, border: '1px solid #D5D0E0',
  borderRadius: 6, background: '#F6F4FA', cursor: 'pointer', minHeight: 36,
};

const decBtnActiveStyle: React.CSSProperties = {
  background: '#7028e0', color: '#fff', border: '1px solid #7028e0',
};
