import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface ColumnCalcData {
  op1: string[];
  op2: string[];
  result: string[];
  carry: string[];
  intermediates: string[][]; // intermediate lines for multi-digit multiplication
  operator: string;
  decimalPosition: number | null; // number of decimal places (null = integer mode)
}

interface ColumnCalcProps {
  left: number;
  top: number;
  initialOp1?: string;
  initialOp2?: string;
  initialOperator?: string;
  initialResult?: string;
  savedData?: ColumnCalcData;
  onCommit: (expression: string, data: ColumnCalcData) => void;
  onCancel: () => void;
}

const OPERATORS = ['+', '−', '×'];
const NUM_COLS = 6; // 6 columns for intermediate results
const CELL = 48;
const GAP = 4;

type Row = string[];

function emptyRow(): Row {
  return Array(NUM_COLS).fill('');
}

function numToRow(num: string | undefined): Row {
  if (!num) return emptyRow();
  // Remove comma/dot for digit extraction
  const clean = (num || '').replace(/[,\.]/g, '');
  const digits = clean.split('');
  const row = emptyRow();
  for (let i = 0; i < digits.length && i < NUM_COLS; i++) {
    row[NUM_COLS - 1 - i] = digits[digits.length - 1 - i];
  }
  return row;
}

function detectDecimalPosition(num: string | undefined): number | null {
  if (!num) return null;
  const match = num.match(/[,\.](\d+)$/);
  return match ? match[1].length : null;
}

function rowToNumWithDecimal(row: Row, decPos: number | null): string {
  const raw = row.join('').replace(/^0+/, '') || '0';
  if (decPos === null || decPos === 0) return raw;
  // Pad raw if shorter than decPos (e.g. "5" with decPos=2 → "0,05")
  const padded = raw.padStart(decPos + 1, '0');
  const intPart = padded.slice(0, -decPos) || '0';
  const decPart = padded.slice(-decPos);
  return `${intPart},${decPart}`;
}

function rowToNum(row: Row): string {
  return row.join('').replace(/^0+/, '') || '0';
}

// Count non-empty digits in op2 to determine how many intermediate lines needed
function countDigits(row: Row): number {
  return row.filter(d => d !== '').length;
}

export function ColumnCalc({ left, top: _top, initialOp1, initialOp2, initialOperator, initialResult, savedData, onCommit, onCancel }: ColumnCalcProps) {
  const [op1, setOp1] = useState<Row>(savedData?.op1 || numToRow(initialOp1));
  const [op2, setOp2] = useState<Row>(savedData?.op2 || numToRow(initialOp2));
  const [result, setResult] = useState<Row>(savedData?.result || numToRow(initialResult));
  const [carry, setCarry] = useState<Row>(savedData?.carry || emptyRow());
  const [intermediates, setIntermediates] = useState<Row[]>(
    savedData?.intermediates || [emptyRow()]
  );
  const [operator, setOperator] = useState(savedData?.operator || initialOperator || '+');
  const initialDecPos = detectDecimalPosition(initialOp1)
    ?? detectDecimalPosition(initialOp2)
    ?? savedData?.decimalPosition
    ?? null;
  const [decimalPosition, setDecimalPosition] = useState<number | null>(initialDecPos);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Auto-adjust number of intermediate lines based on op2 digits (for multiplication)
  const op2Digits = countDigits(op2);
  const needsIntermediates = operator === '×' && op2Digits > 1;
  const numIntermediates = needsIntermediates ? op2Digits : 0;

  // Ensure we have enough intermediate rows
  useEffect(() => {
    if (needsIntermediates && intermediates.length < numIntermediates) {
      setIntermediates(prev => {
        const next = [...prev];
        while (next.length < numIntermediates) next.push(emptyRow());
        return next;
      });
    }
  }, [numIntermediates, needsIntermediates, intermediates.length]);

  useEffect(() => {
    setTimeout(() => {
      if (initialOp1) {
        const ref = cellRefs.current.get(`result-${NUM_COLS - 1}`);
        ref?.focus();
      } else {
        const ref = cellRefs.current.get(`op1-0`);
        ref?.focus();
      }
    }, 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCellRef = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const handleCellChange = (
    row: Row,
    setRow: ((r: Row) => void) | null,
    rowName: string,
    col: number,
    value: string,
    intIdx?: number,
  ) => {
    // Accept comma as decimal separator — convert to dot internally
    const normalized = value.replace(/,/g, '.');
    const digit = normalized.replace(/[^0-9]/g, '').slice(-1);
    const next = [...row];
    next[col] = digit;

    if (intIdx !== undefined) {
      // Update intermediate row
      setIntermediates(prev => {
        const copy = prev.map(r => [...r]);
        copy[intIdx] = next;
        return copy;
      });
    } else if (setRow) {
      setRow(next);
    }

    // Auto-advance
    if (digit) {
      setTimeout(() => {
        let nextRef: HTMLInputElement | undefined;
        if (rowName.startsWith('op') || rowName.startsWith('int')) {
          // Left → right for operands and intermediates
          if (col < NUM_COLS - 1) nextRef = cellRefs.current.get(`${rowName}-${col + 1}`);
        } else if (rowName === 'result') {
          // Right → left, zigzag to carry
          if (col > 0) nextRef = cellRefs.current.get(`carry-${col - 1}`);
        } else if (rowName === 'carry') {
          nextRef = cellRefs.current.get(`result-${col}`);
        }
        nextRef?.focus();
        nextRef?.select();
      }, 0);
    }
  };

  const focusCell = (name: string) => {
    // Use DOM query as reliable fallback
    const el = cellRefs.current.get(name) || document.querySelector<HTMLInputElement>(`[data-cell="${name}"]`);
    el?.focus();
  };

  const handleKeyDown = (rowName: string, col: number, e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (col < NUM_COLS - 1) focusCell(`${rowName}-${col + 1}`);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (col > 0) focusCell(`${rowName}-${col - 1}`);
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const allRows = ['carry', 'op1', 'op2'];
      if (needsIntermediates) {
        for (let i = 0; i < numIntermediates; i++) allRows.push(`int${i}`);
      }
      allRows.push('result');
      const idx = allRows.indexOf(rowName);
      const nextIdx = e.key === 'ArrowDown' ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < allRows.length) {
        focusCell(`${allRows[nextIdx]}-${col}`);
      }
    }
    if (e.key === 'Backspace' && !((e.target as HTMLInputElement).value)) {
      e.preventDefault();
      if (rowName.startsWith('op') || rowName.startsWith('int')) {
        if (col > 0) focusCell(`${rowName}-${col - 1}`);
      } else {
        if (col < NUM_COLS - 1) focusCell(`${rowName}-${col + 1}`);
      }
    }
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };

  const commit = () => {
    const n1 = decimalPosition !== null ? rowToNumWithDecimal(op1, decimalPosition) : rowToNum(op1);
    const n2 = decimalPosition !== null ? rowToNumWithDecimal(op2, decimalPosition) : rowToNum(op2);
    const res = decimalPosition !== null ? rowToNumWithDecimal(result, decimalPosition) : rowToNum(result);
    const op = operator === '−' ? '-' : operator === '×' ? '×' : operator;
    const rawExpr = res && n1 !== '0' && n2 !== '0'
      ? `${n1} ${op} ${n2} = ${res}`
      : n1 !== '0' && n2 !== '0'
      ? `${n1} ${op} ${n2}`
      : '';
    // French decimal format: replace dots with commas
    const expr = rawExpr.replace(/\./g, ',');
    const data: ColumnCalcData = {
      op1: [...op1], op2: [...op2], result: [...result],
      carry: [...carry], intermediates: intermediates.map(r => [...r]), operator,
      decimalPosition,
    };
    onCommit(expr || '', data);
  };

  return (
    <div
      style={{
        position: 'absolute', left: Math.max(8, left), top: 8,
        background: '#fff', border: '2px solid #7028e0',
        borderRadius: 10, padding: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 20,
        maxHeight: 'calc(100% - 16px)', overflowY: 'auto',
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div style={{ fontSize: 13, color: '#7028e0', fontWeight: 600, marginBottom: 10 }}>
        Calcul en colonnes
      </div>

      {/* Carry row */}
      <div style={{ display: 'flex', gap: GAP, marginBottom: 4, marginLeft: CELL + GAP }}>
        {carry.map((d, col) => (
          <React.Fragment key={`carry-${col}`}>
            {decimalPosition !== null && col === NUM_COLS - decimalPosition && (
              <span style={decimalSepStyle}>,</span>
            )}
            <input
              ref={el => setCellRef(`carry-${col}`, el)}
              data-cell={`carry-${col}`}
              type="text" inputMode="decimal" maxLength={1}
              value={d}
              onChange={e => handleCellChange(carry, setCarry, 'carry', col, e.target.value)}
              onKeyDown={e => handleKeyDown('carry', col, e)}
              onFocus={e => e.target.select()}
              placeholder="·"
              style={carryStyle}
            />
          </React.Fragment>
        ))}
      </div>

      {/* Operand 1 */}
      <div style={{ display: 'flex', gap: GAP, marginBottom: GAP, alignItems: 'center' }}>
        <div style={{ width: CELL, height: CELL }} />
        {op1.map((d, col) => (
          <React.Fragment key={`op1-${col}`}>
            {decimalPosition !== null && col === NUM_COLS - decimalPosition && (
              <span style={decimalSepStyle}>,</span>
            )}
            <CellInput cellId={`op1-${col}`} refCb={el => setCellRef(`op1-${col}`, el)}
              value={d} onChange={v => handleCellChange(op1, setOp1, 'op1', col, v)}
              onKeyDown={e => handleKeyDown('op1', col, e)} />
          </React.Fragment>
        ))}
      </div>

      {/* Operator + Operand 2 */}
      <div style={{ display: 'flex', gap: GAP, marginBottom: GAP, alignItems: 'center' }}>
        <select value={operator} onChange={e => setOperator(e.target.value)}
          style={{ width: CELL, height: CELL, fontSize: 24, textAlign: 'center', border: '2px solid #D5D0E0', borderRadius: 6, background: '#F6F4FA', cursor: 'pointer', fontFamily: 'monospace' }}>
          {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
        {op2.map((d, col) => (
          <React.Fragment key={`op2-${col}`}>
            {decimalPosition !== null && col === NUM_COLS - decimalPosition && (
              <span style={decimalSepStyle}>,</span>
            )}
            <CellInput cellId={`op2-${col}`} refCb={el => setCellRef(`op2-${col}`, el)}
              value={d} onChange={v => handleCellChange(op2, setOp2, 'op2', col, v)}
              onKeyDown={e => handleKeyDown('op2', col, e)} />
          </React.Fragment>
        ))}
      </div>

      {/* First separator */}
      <div style={{ borderTop: '3px solid #1E1A2E', margin: `${GAP}px 0`, marginLeft: CELL + GAP }} />

      {/* Intermediate lines (for multi-digit multiplication) */}
      {needsIntermediates && (
        <>
          {intermediates.slice(0, numIntermediates).map((intRow, intIdx) => (
            <div key={`int-${intIdx}`} style={{ display: 'flex', gap: GAP, marginBottom: GAP, alignItems: 'center' }}>
              <div style={{ width: CELL, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9CA3AF' }}>
                {intIdx === 0 ? '' : `+`}
              </div>
              {intRow.map((d, col) => (
                <React.Fragment key={`int${intIdx}-${col}`}>
                  {decimalPosition !== null && col === NUM_COLS - decimalPosition && (
                    <span style={decimalSepStyle}>,</span>
                  )}
                  <CellInput cellId={`int${intIdx}-${col}`}
                    refCb={el => setCellRef(`int${intIdx}-${col}`, el)}
                    value={d}
                    onChange={v => handleCellChange(intRow, null, `int${intIdx}`, col, v, intIdx)}
                    onKeyDown={e => handleKeyDown(`int${intIdx}`, col, e)} />
                </React.Fragment>
              ))}
            </div>
          ))}
          {/* Second separator before final result */}
          <div style={{ borderTop: '3px solid #1E1A2E', margin: `${GAP}px 0`, marginLeft: CELL + GAP }} />
        </>
      )}

      {/* Result */}
      <div style={{ display: 'flex', gap: GAP, alignItems: 'center' }}>
        <div style={{ width: CELL, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#55506A' }}>
          =
        </div>
        {result.map((d, col) => (
          <React.Fragment key={`result-${col}`}>
            {decimalPosition !== null && col === NUM_COLS - decimalPosition && (
              <span style={decimalSepStyle}>,</span>
            )}
            <CellInput cellId={`result-${col}`} refCb={el => setCellRef(`result-${col}`, el)}
              value={d} onChange={v => handleCellChange(result, setResult, 'result', col, v)}
              onKeyDown={e => handleKeyDown('result', col, e)} bold />
          </React.Fragment>
        ))}
      </div>

      {/* Decimal mode buttons */}
      <div style={{ display: 'flex', gap: GAP, marginTop: 8 }}>
        <button onClick={() => setDecimalPosition(null)}
          style={{ ...decBtnStyle, ...(decimalPosition === null ? decBtnActiveStyle : {}) }}>
          Entier
        </button>
        <button onClick={() => setDecimalPosition(1)}
          style={{ ...decBtnStyle, ...(decimalPosition === 1 ? decBtnActiveStyle : {}) }}>
          1 décimale
        </button>
        <button onClick={() => setDecimalPosition(2)}
          style={{ ...decBtnStyle, ...(decimalPosition === 2 ? decBtnActiveStyle : {}) }}>
          2 décimales
        </button>
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnStyle}>Annuler</button>
        <button onClick={commit} style={{ ...btnStyle, background: '#7028e0', color: '#fff', border: 'none' }}>Valider</button>
      </div>
    </div>
  );
}

function CellInput({ value, onChange, onKeyDown, refCb, bold, cellId }: {
  value: string; onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  refCb: (el: HTMLInputElement | null) => void; bold?: boolean;
  cellId?: string;
}) {
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
        outline: 'none', background: '#FAFCFF',
      }} />
  );
}

const carryStyle: React.CSSProperties = {
  width: CELL, height: CELL * 0.65, fontSize: 18, textAlign: 'center',
  border: '1px dashed #D5D0E0', background: '#FEF9EF', borderRadius: 4,
  color: '#9060C0', fontFamily: 'monospace', outline: 'none',
};

const btnStyle: React.CSSProperties = {
  padding: '10px 20px', fontSize: 14, border: '1px solid #D5D0E0',
  borderRadius: 6, background: '#F6F4FA', cursor: 'pointer', minHeight: 44,
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
