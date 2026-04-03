/**
 * TableauEditor — HTML overlay for editing tableau cells.
 * Same pattern as ColumnCalc/DivisionCalc: positioned over the SVG canvas.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

const CELL = 48; // px per cell
const GAP = 2;

interface TableauEditorProps {
  left: number;
  top: number;
  initialCells: string[][];
  rows: number;
  cols: number;
  headerRow: boolean;
  onCommit: (cells: string[][]) => void;
  onCancel: () => void;
}

export function TableauEditor({ left, top: _top, initialCells, rows, cols, headerRow, onCommit, onCancel }: TableauEditorProps) {
  const [cells, setCells] = useState<string[][]>(() =>
    initialCells.map(r => [...r])
  );
  const cellRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    // Focus first empty cell, or first cell
    setTimeout(() => {
      let focused = false;
      for (let r = 0; r < rows && !focused; r++) {
        for (let c = 0; c < cols && !focused; c++) {
          if (!cells[r][c]) {
            cellRefs.current.get(`${r}-${c}`)?.focus();
            focused = true;
          }
        }
      }
      if (!focused) cellRefs.current.get('0-0')?.focus();
    }, 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (row: number, col: number, value: string) => {
    setCells(prev => prev.map((r, ri) =>
      ri === row ? r.map((c, ci) => ci === col ? value : c) : r
    ));
  };

  const handleKeyDown = useCallback((row: number, col: number, e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // Move to next cell (right, then next row)
      let nextCol = col + 1;
      let nextRow = row;
      if (nextCol >= cols) { nextCol = 0; nextRow++; }
      if (nextRow >= rows) { nextRow = 0; } // wrap
      cellRefs.current.get(`${nextRow}-${nextCol}`)?.focus();
    }
    if (e.key === 'ArrowRight' && col < cols - 1) {
      cellRefs.current.get(`${row}-${col + 1}`)?.focus();
    }
    if (e.key === 'ArrowLeft' && col > 0) {
      cellRefs.current.get(`${row}-${col - 1}`)?.focus();
    }
    if (e.key === 'ArrowDown' && row < rows - 1) {
      cellRefs.current.get(`${row + 1}-${col}`)?.focus();
    }
    if (e.key === 'ArrowUp' && row > 0) {
      cellRefs.current.get(`${row - 1}-${col}`)?.focus();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      // Move down, or commit if last row
      if (row < rows - 1) {
        cellRefs.current.get(`${row + 1}-${col}`)?.focus();
      } else {
        onCommit(cells);
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [rows, cols, cells, onCommit, onCancel]);

  const commit = () => onCommit(cells);

  return (
    <div
      style={{
        position: 'absolute', left: Math.max(8, left), top: 8,
        background: '#fff', border: '2px solid #7028e0',
        borderRadius: 10, padding: 12,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', zIndex: 20,
      }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div style={{ fontSize: 13, color: '#7028e0', fontWeight: 600, marginBottom: 8 }}>
        Tableau
      </div>

      {/* Grid of inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
        {cells.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: GAP }}>
            {row.map((cell, ci) => (
              <input
                key={`${ri}-${ci}`}
                ref={el => {
                  if (el) cellRefs.current.set(`${ri}-${ci}`, el);
                  else cellRefs.current.delete(`${ri}-${ci}`);
                }}
                type="text"
                value={cell}
                placeholder={ri === 0 && headerRow ? 'En-tête' : ''}
                onChange={e => handleChange(ri, ci, e.target.value)}
                onKeyDown={e => handleKeyDown(ri, ci, e)}
                style={{
                  width: CELL,
                  height: CELL,
                  fontSize: 14,
                  textAlign: 'center',
                  border: `2px solid ${ri === 0 && headerRow ? '#7028e0' : '#D5D0E0'}`,
                  borderRadius: 4,
                  background: ri === 0 && headerRow ? '#F2F0F8' : '#fff',
                  fontWeight: ri === 0 && headerRow ? 600 : 400,
                  outline: 'none',
                  padding: 2,
                }}
                onFocus={e => e.target.select()}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button onClick={commit} style={btnStyle('#7028e0', '#fff')}>Valider</button>
        <button onClick={onCancel} style={btnStyle('#F6F4FA', '#55506A')}>Annuler</button>
      </div>
    </div>
  );
}

function btnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: '8px 16px', fontSize: 13, border: '1px solid #D5D0E0',
    borderRadius: 6, background: bg, cursor: 'pointer', minHeight: 44,
    color, fontWeight: 500,
  };
}
