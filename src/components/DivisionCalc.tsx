import { useState, useRef, useEffect, useCallback } from 'react';

export interface DivisionCalcData {
  type: 'division';
  dividend: string[];      // digits of dividend (6 cells)
  divisor: string[];       // digits of divisor (3 cells)
  quotient: string[];      // digits of quotient (6 cells)
  remainder: string;       // final remainder (1-2 digits)
  steps: DivisionStep[];   // variable number of division steps
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

function numToRow(num: string | undefined, cols: number): Row {
  if (!num) return emptyRow(cols);
  const digits = num.split('');
  const row = emptyRow(cols);
  for (let i = 0; i < digits.length && i < cols; i++) {
    row[cols - 1 - i] = digits[digits.length - 1 - i];
  }
  return row;
}

function rowToNum(row: Row): string {
  return row.join('').replace(/^0+/, '') || '0';
}

function emptyStep(): DivisionStep {
  return {
    product: emptyRow(DIV_COLS),
    partialRemainder: emptyRow(DIV_COLS),
  };
}

export function DivisionCalc({ left, top: _top, initialDividend, initialDivisor, savedData, onCommit, onCancel }: DivisionCalcProps) {
  const [dividend, setDividend] = useState<Row>(savedData?.dividend || numToRow(initialDividend, DIV_COLS));
  const [divisor, setDivisor] = useState<Row>(savedData?.divisor || numToRow(initialDivisor, DIVISOR_COLS));
  const [quotient, setQuotient] = useState<Row>(savedData?.quotient || emptyRow(DIV_COLS));
  const [remainder, setRemainder] = useState(savedData?.remainder || '');
  const [steps, setSteps] = useState<DivisionStep[]>(savedData?.steps || [emptyStep()]);
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    setTimeout(() => {
      // Focus first divisor cell if empty, otherwise first quotient cell
      const hasData = divisor.some(d => d !== '');
      if (hasData) {
        const ref = cellRefs.current.get(`quotient-0`);
        ref?.focus();
      } else {
        const ref = cellRefs.current.get(`divisor-0`);
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

  const handleCellChange = (
    row: Row,
    setRow: ((r: Row) => void) | null,
    rowName: string,
    col: number,
    value: string,
    stepIdx?: number,
    stepField?: 'product' | 'partialRemainder',
  ) => {
    const normalized = value.replace(/,/g, '.');
    const digit = normalized.replace(/[^0-9]/g, '').slice(-1);
    const next = [...row];
    next[col] = digit;

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
    const digit = value.replace(/[^0-9]/g, '').slice(0, 2);
    setRemainder(digit);
  };

  // Build the ordered list of all row names for vertical navigation
  const allRowNames = (): string[] => {
    const rows: string[] = ['quotient', 'divisor', 'dividend'];
    for (let i = 0; i < steps.length; i++) {
      rows.push(`step${i}-product`);
      rows.push(`step${i}-remainder`);
    }
    return rows;
  };

  const handleKeyDown = (rowName: string, col: number, e: React.KeyboardEvent, maxCols?: number) => {
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
    const dividendStr = rowToNum(dividend);
    const divisorStr = rowToNum(divisor);
    const quotientStr = rowToNum(quotient);
    // J4: don't commit "0 ÷ 0 = 0" for empty grids
    if (divisorStr === '0' || dividendStr === '0') {
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
    };
    onCommit(expr, data);
  };

  // Width calculations
  const divisorWidth = DIVISOR_COLS * (CELL + GAP) - GAP;
  const dividendWidth = DIV_COLS * (CELL + GAP) - GAP;
  const bracketWidth = 3; // vertical bar thickness
  const bracketGap = 8;   // gap around bracket
  const totalDividendAreaLeft = divisorWidth + bracketGap + bracketWidth + bracketGap;

  return (
    <div
      style={{
        position: 'absolute', left: Math.max(8, left), top: 8,
        background: '#fff', border: '2px solid #185FA5',
        borderRadius: 10, padding: 16,
        maxHeight: 'calc(100% - 16px)', overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 20,
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div style={{ fontSize: 13, color: '#185FA5', fontWeight: 600, marginBottom: 10 }}>
        Division posée
      </div>

      {/* Quotient row + remainder */}
      <div style={{ display: 'flex', gap: GAP, marginBottom: 0, alignItems: 'center' }}>
        {/* Spacer for divisor + bracket area */}
        <div style={{ width: totalDividendAreaLeft, flexShrink: 0 }} />
        {quotient.map((d, col) => (
          <CellInput
            key={`quotient-${col}`}
            cellId={`quotient-${col}`}
            refCb={el => setCellRef(`quotient-${col}`, el)}
            value={d}
            onChange={v => handleCellChange(quotient, setQuotient, 'quotient', col, v)}
            onKeyDown={e => handleKeyDown('quotient', col, e)}
            bold
            colIdx={col}
          />
        ))}
        {/* Remainder label and input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4,
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#6B7280', fontFamily: 'monospace' }}>R</span>
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
              border: '2px solid #D1D5DB', borderRadius: 6,
              fontFamily: "'Consolas', 'Courier New', monospace",
              outline: 'none', background: '#FAFCFF',
            }}
          />
        </div>
      </div>

      {/* Horizontal bar (top of crochet) */}
      <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 0 }}>
        <div style={{ width: totalDividendAreaLeft, flexShrink: 0 }} />
        <div style={{
          flex: 1,
          borderTop: '3px solid #1A2433',
          height: 0,
          marginTop: GAP,
          marginBottom: GAP,
        }} />
      </div>

      {/* Divisor | Dividend row */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
        {/* Divisor cells */}
        <div style={{ display: 'flex', gap: GAP }}>
          {divisor.map((d, col) => (
            <CellInput
              key={`divisor-${col}`}
              cellId={`divisor-${col}`}
              refCb={el => setCellRef(`divisor-${col}`, el)}
              value={d}
              onChange={v => handleCellChange(divisor, setDivisor, 'divisor', col, v)}
              onKeyDown={e => handleKeyDown('divisor', col, e, DIVISOR_COLS)}
              colIdx={col}
            />
          ))}
        </div>

        {/* Vertical bracket bar */}
        <div style={{
          width: bracketWidth,
          alignSelf: 'stretch',
          background: '#1A2433',
          marginLeft: bracketGap,
          marginRight: bracketGap,
          borderRadius: 1,
        }} />

        {/* Dividend cells */}
        <div style={{ display: 'flex', gap: GAP }}>
          {dividend.map((d, col) => (
            <CellInput
              key={`dividend-${col}`}
              cellId={`dividend-${col}`}
              refCb={el => setCellRef(`dividend-${col}`, el)}
              value={d}
              onChange={v => handleCellChange(dividend, setDividend, 'dividend', col, v)}
              onKeyDown={e => handleKeyDown('dividend', col, e)}
              colIdx={col}
            />
          ))}
        </div>
      </div>

      {/* Steps */}
      {steps.map((step, stepIdx) => (
        <div key={`step-${stepIdx}`}>
          {/* Subtraction line: "−" label + product cells */}
          <div style={{ display: 'flex', gap: 0, alignItems: 'center', marginTop: GAP * 2 }}>
            <div style={{ width: totalDividendAreaLeft, flexShrink: 0, display: 'flex', justifyContent: 'flex-end', paddingRight: 4 }}>
              <span style={{ fontSize: 22, color: '#4B5563', fontFamily: 'monospace', fontWeight: 600 }}>−</span>
            </div>
            <div style={{ display: 'flex', gap: GAP }}>
              {step.product.map((d, col) => (
                <CellInput
                  key={`step${stepIdx}-product-${col}`}
                  cellId={`step${stepIdx}-product-${col}`}
                  refCb={el => setCellRef(`step${stepIdx}-product-${col}`, el)}
                  value={d}
                  onChange={v => handleCellChange(step.product, null, `step${stepIdx}-product`, col, v, stepIdx, 'product')}
                  onKeyDown={e => handleKeyDown(`step${stepIdx}-product`, col, e)}
                  colIdx={col}
                />
              ))}
            </div>
          </div>

          {/* Separator line */}
          <div style={{ display: 'flex', marginTop: GAP, marginBottom: GAP }}>
            <div style={{ width: totalDividendAreaLeft, flexShrink: 0 }} />
            <div style={{
              width: dividendWidth,
              borderTop: '1px solid #9CA3AF',
            }} />
          </div>

          {/* Partial remainder row */}
          <div style={{ display: 'flex', gap: 0, alignItems: 'center' }}>
            <div style={{ width: totalDividendAreaLeft, flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: GAP }}>
              {step.partialRemainder.map((d, col) => (
                <CellInput
                  key={`step${stepIdx}-remainder-${col}`}
                  cellId={`step${stepIdx}-remainder-${col}`}
                  refCb={el => setCellRef(`step${stepIdx}-remainder-${col}`, el)}
                  value={d}
                  onChange={v => handleCellChange(step.partialRemainder, null, `step${stepIdx}-remainder`, col, v, stepIdx, 'partialRemainder')}
                  onKeyDown={e => handleKeyDown(`step${stepIdx}-remainder`, col, e)}
                  colIdx={col}
                />
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Add/remove step buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 12, marginLeft: totalDividendAreaLeft }}>
        {steps.length < MAX_STEPS && (
          <button onClick={addStep} style={addStepBtnStyle}>
            + Ajouter une étape
          </button>
        )}
        {steps.length > 1 && (
          <button onClick={removeStep} style={{ ...addStepBtnStyle, color: '#9CA3AF', borderColor: '#D1D5DB' }}>
            − Retirer
          </button>
        )}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnStyle}>Annuler</button>
        <button onClick={commit} style={{ ...btnStyle, background: '#185FA5', color: '#fff', border: 'none' }}>Valider</button>
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
        border: '2px solid #D1D5DB', borderRadius: 6,
        fontFamily: "'Consolas', 'Courier New', monospace",
        outline: 'none',
        background: isEvenCol ? 'rgba(0,0,0,0.02)' : '#FAFCFF',
      }} />
  );
}

const btnStyle: React.CSSProperties = {
  padding: '10px 20px', fontSize: 14, border: '1px solid #D1D5DB',
  borderRadius: 6, background: '#F5F7FA', cursor: 'pointer', minHeight: 44,
};

const addStepBtnStyle: React.CSSProperties = {
  padding: '8px 16px', fontSize: 13, border: '1px dashed #185FA5',
  borderRadius: 6, background: '#EBF0F9', cursor: 'pointer', minHeight: 44,
  color: '#185FA5', fontWeight: 500,
};
