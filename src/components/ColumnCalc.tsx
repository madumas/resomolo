import React, { useState, useRef, useEffect, useCallback } from 'react';
import { onSnap } from '../engine/sound';

export interface ColumnCalcData {
  operands: string[][];    // 2-6 operand rows, each is string[NUM_COLS]
  result: string[];
  carry: string[];
  intermediates: string[][]; // intermediate lines for multi-digit multiplication
  operator: string;
  decimalPosition: number | null; // number of decimal places (null = integer mode)
  borrow?: boolean[]; // borrow indicator per first operand cell (subtraction only)
  carryBorrow?: boolean[]; // borrow indicator per carry cell (subtraction cascading)
  addCarry?: string[]; // carry row for addition of intermediates (multiplication)
}

/** Migrate legacy { op1, op2 } format to { operands } */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function migrateColumnCalcData(raw: any): ColumnCalcData {
  if (raw.operands) return raw as ColumnCalcData;
  return {
    ...raw,
    operands: [raw.op1 || emptyRow(), raw.op2 || emptyRow()],
  };
}

interface ColumnCalcProps {
  left: number;
  top: number;
  initialOperands?: string[];   // parsed operand strings (e.g. ["45", "3", "12"])
  initialOperator?: string;
  initialResult?: string;
  savedData?: ColumnCalcData;
  onCommit: (expression: string, data: ColumnCalcData) => void;
  onCancel: () => void;
}

const OPERATORS = ['+', '−', '×'];
const MAX_OPERANDS = 6;
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
  if (decPos === null || decPos === 0) {
    return row.join('').replace(/^0+/, '') || '0';
  }
  // Split row into integer cells and decimal cells based on grid position
  const intCells = row.slice(0, NUM_COLS - decPos);
  const decCells = row.slice(NUM_COLS - decPos);
  const intPart = intCells.join('').replace(/^0+/, '') || '0';
  const decPart = decCells.join('');
  // If no decimal digits entered, return integer only
  if (!decPart || decPart.replace(/0/g, '') === '') {
    return intPart;
  }
  return `${intPart},${decPart}`;
}

function rowToNum(row: Row): string {
  return row.join('').replace(/^0+/, '') || '0';
}

// Count non-empty digits in a row to determine how many intermediate lines needed
function countDigits(row: Row): number {
  return row.filter(d => d !== '').length;
}

export function ColumnCalc({ left, top: _top, initialOperands, initialOperator, initialResult, savedData, onCommit, onCancel }: ColumnCalcProps) {
  const migratedData = savedData ? migrateColumnCalcData(savedData) : undefined;

  const initOps = migratedData?.operands
    || (initialOperands && initialOperands.length >= 2
      ? initialOperands.slice(0, MAX_OPERANDS).map(n => numToRow(n))
      : [emptyRow(), emptyRow()]);

  const [operands, setOperands] = useState<Row[]>(initOps);
  const [result, setResult] = useState<Row>(migratedData?.result || numToRow(initialResult));
  const [carry, setCarry] = useState<Row>(migratedData?.carry || emptyRow());
  const [intermediates, setIntermediates] = useState<Row[]>(
    migratedData?.intermediates || [emptyRow()]
  );
  const [operator, setOperator] = useState(migratedData?.operator || initialOperator || '+');
  const [borrow, setBorrow] = useState<boolean[]>(migratedData?.borrow || Array(NUM_COLS).fill(false));
  const [carryBorrow, setCarryBorrow] = useState<boolean[]>(migratedData?.carryBorrow || Array(NUM_COLS).fill(false));
  const [addCarry, setAddCarry] = useState<Row>(migratedData?.addCarry || emptyRow());
  const [lastModified, setLastModified] = useState<{ cellId: string; prevValue: string } | null>(null);
  const initialDecPos = (initialOperands && initialOperands.length > 0
    ? initialOperands.reduce<number | null>((acc, n) => acc ?? detectDecimalPosition(n), null)
    : null)
    ?? migratedData?.decimalPosition
    ?? null;
  const [decimalPosition, setDecimalPosition] = useState<number | null>(initialDecPos);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  // Auto-adjust number of intermediate lines based on last operand digits (for multiplication)
  const lastOp = operands[operands.length - 1];
  const lastOpDigits = countDigits(lastOp);
  const needsIntermediates = operator === '×' && lastOpDigits > 1;
  const numIntermediates = needsIntermediates ? lastOpDigits : 0;

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
      if (initialOperands && initialOperands.length > 0) {
        const ref = cellRefs.current.get(`result-${NUM_COLS - 1}`);
        ref?.focus();
      } else {
        const ref = cellRefs.current.get(`op0-0`);
        ref?.focus();
      }
    }, 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setCellRef = useCallback((key: string, el: HTMLInputElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  }, []);

  const applyValueToCell = (cellId: string, value: string) => {
    const parts = cellId.split('-');
    const rowName = parts[0];
    const col = parseInt(parts[parts.length - 1]);
    if (rowName.startsWith('op')) {
      const opIdx = parseInt(rowName.replace('op', ''));
      setOperands(prev => {
        const next = prev.map(r => [...r]);
        if (next[opIdx]) next[opIdx][col] = value;
        return next;
      });
    } else if (rowName === 'result') setResult(prev => { const n = [...prev]; n[col] = value; return n; });
    else if (rowName === 'carry') setCarry(prev => { const n = [...prev]; n[col] = value; return n; });
    else if (rowName === 'addCarry') setAddCarry(prev => { const n = [...prev]; n[col] = value; return n; });
    else if (rowName.startsWith('int')) {
      const intIdx = parseInt(rowName.replace('int', ''));
      setIntermediates(prev => {
        const copy = prev.map(r => [...r]);
        if (copy[intIdx]) copy[intIdx][col] = value;
        return copy;
      });
    }
  };

  const handleOups = () => {
    if (!lastModified) return;
    applyValueToCell(lastModified.cellId, lastModified.prevValue);
    focusCell(lastModified.cellId);
    setLastModified(null);
    onSnap();
  };

  // Change decimal position: shift digits so the comma adds/removes places on the RIGHT
  const changeDecimalPosition = (newDecPos: number | null) => {
    const oldDecPos = decimalPosition ?? 0;
    const newDec = newDecPos ?? 0;
    const shift = newDec - oldDecPos;

    if (shift !== 0) {
      const shiftRow = (row: Row): Row => {
        if (shift > 0) {
          return [...row.slice(shift), ...Array(shift).fill('')];
        } else {
          return [...Array(-shift).fill(''), ...row.slice(0, shift)];
        }
      };
      setOperands(prev => prev.map(r => shiftRow(r)));
      setResult(shiftRow);
      setCarry(shiftRow);
      setAddCarry(shiftRow);
      setIntermediates(prev => prev.map(r => shiftRow(r)));
    }
    setDecimalPosition(newDecPos);
    setLastModified(null);
  };

  const handleCellChange = (
    row: Row,
    setRow: ((r: Row) => void) | null,
    rowName: string,
    col: number,
    value: string,
    intIdx?: number,
  ) => {
    // Save previous value for undo
    setLastModified({ cellId: `${rowName}-${col}`, prevValue: row[col] });
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
    } else if (rowName.startsWith('op')) {
      const opIdx = parseInt(rowName.replace('op', ''));
      setOperands(prev => {
        const copy = prev.map(r => [...r]);
        copy[opIdx] = next;
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
    const el = cellRefs.current.get(name) || document.querySelector<HTMLInputElement>(`[data-cell="${name}"]`);
    el?.focus();
  };

  const handleKeyDown = (rowName: string, col: number, e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
      e.preventDefault();
      e.stopPropagation();
      handleOups();
      return;
    }
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
      const allRows = ['carry'];
      for (let i = 0; i < operands.length; i++) allRows.push(`op${i}`);
      if (needsIntermediates) {
        allRows.push('addCarry');
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

  const addOperand = () => {
    if (operator === '+' && operands.length < MAX_OPERANDS) {
      setOperands(prev => [...prev, emptyRow()]);
    }
  };

  const removeOperand = (idx: number) => {
    if (operands.length > 2) {
      setOperands(prev => prev.filter((_, i) => i !== idx));
      setLastModified(null);
    }
  };

  const commit = () => {
    const isZero = (s: string) => s.replace(/[,0]/g, '') === '';
    const nums = operands.map(op =>
      decimalPosition !== null ? rowToNumWithDecimal(op, decimalPosition) : rowToNum(op)
    );
    const res = decimalPosition !== null ? rowToNumWithDecimal(result, decimalPosition) : rowToNum(result);
    const op = operator === '−' ? '-' : operator === '×' ? '×' : operator;

    const nonZeroNums = nums.filter(n => !isZero(n));
    let rawExpr = '';
    if (nonZeroNums.length >= 2) {
      const joined = nonZeroNums.join(` ${op} `);
      rawExpr = res && !isZero(res) ? `${joined} = ${res}` : joined;
    }

    const data: ColumnCalcData = {
      operands: operands.map(r => [...r]),
      result: [...result],
      carry: [...carry],
      intermediates: intermediates.map(r => [...r]),
      operator,
      decimalPosition,
      borrow: [...borrow],
      carryBorrow: [...carryBorrow],
      addCarry: [...addCarry],
    };
    onCommit(rawExpr || '', data);
  };

  const handleOperatorChange = (newOp: string) => {
    setOperator(newOp);
    // Truncate to 2 operands when switching away from addition
    if (newOp !== '+' && operands.length > 2) {
      setOperands(prev => prev.slice(0, 2));
    }
    if (newOp !== '−') {
      setBorrow(Array(NUM_COLS).fill(false));
      setCarryBorrow(Array(NUM_COLS).fill(false));
    }
  };

  const operatorSelectStyle: React.CSSProperties = {
    width: CELL, height: CELL, fontSize: 24, textAlign: 'center',
    border: '2px solid #D5D0E0', borderRadius: 6, background: '#F6F4FA',
    cursor: 'pointer', fontFamily: 'monospace',
  };

  return (
    <div
      style={{
        position: 'absolute', left: Math.max(8, left), top: 8,
        background: '#fff', border: '2px solid #7028e0',
        borderRadius: 10, padding: 16,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 20,
        maxHeight: 'calc(100% - 16px)', overflowY: 'auto', touchAction: 'manipulation',
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
            <div style={{ position: 'relative' }}>
              {carryBorrow[col] && d !== '' && (
                <span style={{
                  position: 'absolute', left: 2, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12, fontWeight: 700, color: '#9060C0',
                  pointerEvents: 'none', fontFamily: 'monospace', zIndex: 1,
                }}>1</span>
              )}
              <input
                ref={el => setCellRef(`carry-${col}`, el)}
                data-cell={`carry-${col}`}
                type="text" inputMode="decimal" maxLength={1}
                value={d}
                onChange={e => handleCellChange(carry, setCarry, 'carry', col, e.target.value)}
                onKeyDown={e => handleKeyDown('carry', col, e)}
                onFocus={e => e.target.select()}
                onPointerDown={operator === '−' && d !== '' ? (e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  if (e.clientX - rect.left < rect.width / 2) {
                    e.preventDefault();
                    setCarryBorrow(prev => { const n = [...prev]; n[col] = !n[col]; return n; });
                  }
                } : undefined}
                placeholder="·"
                style={{
                  ...carryStyle,
                  border: carryBorrow[col] && d !== '' ? '1px dashed #9060C0' : carryStyle.border,
                }}
              />
            </div>
          </React.Fragment>
        ))}
      </div>

      {/* Operand rows */}
      {operands.map((opRow, opIdx) => {
        const isLast = opIdx === operands.length - 1;
        const canRemove = operands.length > 2 && operator === '+';
        const isFirstOp = opIdx === 0;

        return (
          <div key={`op${opIdx}`} style={{ display: 'flex', gap: GAP, marginBottom: GAP, alignItems: 'center' }}>
            {/* Operator cell on last row, empty spacer or remove button on others */}
            {isLast ? (
              <select value={operator} onChange={e => handleOperatorChange(e.target.value)}
                style={operatorSelectStyle}>
                {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
              </select>
            ) : (
              <div style={{ width: CELL, height: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {canRemove && !isFirstOp && (
                  <button
                    onClick={() => removeOperand(opIdx)}
                    title="Retirer ce nombre"
                    style={{
                      width: 28, height: 28, borderRadius: 14,
                      border: '1px solid #E5D0D0', background: '#FFF5F5',
                      cursor: 'pointer', fontSize: 16, color: '#C06060',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 0, lineHeight: 1,
                    }}
                  >×</button>
                )}
              </div>
            )}
            {/* Digit cells */}
            {opRow.map((d, col) => (
              <React.Fragment key={`op${opIdx}-${col}`}>
                {decimalPosition !== null && col === NUM_COLS - decimalPosition && (
                  <span style={decimalSepStyle}>,</span>
                )}
                <div style={{ position: 'relative' }}>
                  {isFirstOp && borrow[col] && (
                    <span style={{
                      position: 'absolute', left: 3, top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 16, fontWeight: 700, color: '#9060C0',
                      pointerEvents: 'none', fontFamily: 'monospace', zIndex: 1,
                    }}>1</span>
                  )}
                  <CellInput cellId={`op${opIdx}-${col}`} refCb={el => setCellRef(`op${opIdx}-${col}`, el)}
                    value={d} onChange={v => handleCellChange(opRow, null, `op${opIdx}`, col, v)}
                    onKeyDown={e => handleKeyDown(`op${opIdx}`, col, e)}
                    strikethrough={operator === '−' && isFirstOp && carry[col] !== ''}
                    borrowActive={isFirstOp && borrow[col]}
                    onBorrowToggle={operator === '−' && isFirstOp && d !== '' ? () => {
                      setBorrow(prev => { const n = [...prev]; n[col] = !n[col]; return n; });
                    } : undefined} />
                </div>
              </React.Fragment>
            ))}
          </div>
        );
      })}

      {/* Add operand button (addition only, max 6) */}
      {operator === '+' && operands.length < MAX_OPERANDS && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: GAP }}>
          <button onClick={addOperand} style={{
            padding: '4px 16px', fontSize: 13, border: '1px dashed #D5D0E0',
            borderRadius: 6, background: '#FAFAFA', cursor: 'pointer',
            color: '#7028e0', fontWeight: 500, minHeight: 32,
          }}>
            + Nombre
          </button>
        </div>
      )}

      {/* First separator */}
      <div style={{ borderTop: '3px solid #1E1A2E', margin: `${GAP}px 0`, marginLeft: CELL + GAP }} />

      {/* Intermediate lines (for multi-digit multiplication) */}
      {needsIntermediates && (
        <>
          {/* Addition carry row — above intermediates */}
          <div style={{ display: 'flex', gap: GAP, marginBottom: 4, marginTop: 8, alignItems: 'center' }}>
            <div style={{ width: CELL, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9CA3AF' }}>
              +
            </div>
            {addCarry.map((d, col) => (
              <React.Fragment key={`addCarry-${col}`}>
                {decimalPosition !== null && col === NUM_COLS - decimalPosition && (
                  <span style={decimalSepStyle}>,</span>
                )}
                <input
                  ref={el => setCellRef(`addCarry-${col}`, el)}
                  data-cell={`addCarry-${col}`}
                  type="text" inputMode="decimal" maxLength={1}
                  value={d}
                  onChange={e => handleCellChange(addCarry, setAddCarry, 'addCarry', col, e.target.value)}
                  onKeyDown={e => handleKeyDown('addCarry', col, e)}
                  onFocus={e => e.target.select()}
                  placeholder="·"
                  style={carryStyle}
                />
              </React.Fragment>
            ))}
          </div>
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
        {([null, 1, 2] as const).map(dp => (
          <button key={String(dp)} onClick={() => changeDecimalPosition(dp)}
            style={{ ...decBtnStyle, ...(decimalPosition === dp ? decBtnActiveStyle : {}) }}>
            {dp === null ? 'Entier' : dp === 1 ? '1 décimale' : '2 décimales'}
          </button>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
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
        {/* Swap button — multiplication only, both operands have digits */}
        {operator === '×' && operands[0].some(d => d !== '') && operands[1]?.some(d => d !== '') && (
          <button
            onClick={() => {
              setOperands(prev => [prev[1], prev[0]]);
              setCarry(emptyRow());
              setIntermediates([emptyRow()]);
              setLastModified(null);
            }}
            title="Échanger les deux nombres"
            style={{
              minWidth: 48, minHeight: 48, borderRadius: 8,
              background: '#F3F0FA', border: '1px solid #D5D0E0',
              cursor: 'pointer', color: '#55506A',
              display: 'flex', flexDirection: 'column' as const,
              alignItems: 'center', justifyContent: 'center', gap: 1,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>↕</span>
            <span style={{ fontSize: 9 }}>Inverser</span>
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={onCancel} style={btnStyle}>Fermer</button>
        <button onClick={commit} style={{ ...btnStyle, background: '#7028e0', color: '#fff', border: 'none' }}>Terminer</button>
      </div>
    </div>
  );
}

function CellInput({ value, onChange, onKeyDown, refCb, bold, cellId, strikethrough, borrowActive, onBorrowToggle }: {
  value: string; onChange: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  refCb: (el: HTMLInputElement | null) => void; bold?: boolean;
  cellId?: string; strikethrough?: boolean; borrowActive?: boolean;
  onBorrowToggle?: () => void;
}) {
  return (
    <input ref={refCb} type="text" inputMode="decimal" maxLength={1}
      data-cell={cellId}
      value={value} onChange={e => onChange(e.target.value)}
      onKeyDown={onKeyDown} onFocus={e => e.target.select()}
      onPointerDown={onBorrowToggle ? (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (e.clientX - rect.left < rect.width / 2) {
          e.preventDefault();
          onBorrowToggle();
        }
      } : undefined}
      style={{
        width: CELL, height: CELL, fontSize: 28,
        fontWeight: bold ? 700 : 400, textAlign: 'center',
        border: `2px solid ${borrowActive ? '#9060C0' : value ? '#D5D0E0' : '#E8E5F0'}`, borderRadius: 6,
        fontFamily: "'Consolas', 'Courier New', monospace",
        outline: 'none', background: value ? '#FAFCFF' : '#F8F7FC',
        opacity: value ? 1 : 0.5,
        textDecoration: strikethrough ? 'line-through' : 'none',
        transition: 'opacity 0.2s, border-color 0.2s, background 0.2s',
      }} />
  );
}


const carryStyle: React.CSSProperties = {
  width: CELL, height: CELL * 0.79, fontSize: 18, textAlign: 'center',
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
