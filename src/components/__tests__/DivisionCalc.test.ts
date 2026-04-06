import { describe, it, expect } from 'vitest';
import { detectDecimalPosition, numToRow, rowToNumWithDecimal } from '../DivisionCalc';

describe('detectDecimalPosition', () => {
  it('returns 2 for "12.60"', () => {
    expect(detectDecimalPosition('12.60')).toBe(2);
  });
  it('returns 2 for "12,60"', () => {
    expect(detectDecimalPosition('12,60')).toBe(2);
  });
  it('returns 1 for "2.5"', () => {
    expect(detectDecimalPosition('2.5')).toBe(1);
  });
  it('returns null for "3"', () => {
    expect(detectDecimalPosition('3')).toBeNull();
  });
  it('returns null for undefined', () => {
    expect(detectDecimalPosition(undefined)).toBeNull();
  });
});

describe('numToRow with decimal', () => {
  it('places "12.60" correctly with decimalPos=2 in 6 cols', () => {
    expect(numToRow('12.60', 6, 2)).toEqual(['', '', '1', '2', '6', '0']);
  });
  it('places "3" in integer mode (6 cols)', () => {
    expect(numToRow('3', 6, null)).toEqual(['', '', '', '', '', '3']);
  });
  it('places "3" without decimalPos (6 cols)', () => {
    expect(numToRow('3', 6)).toEqual(['', '', '', '', '', '3']);
  });
  it('places "2.5" with decimalPos=1 in 6 cols', () => {
    expect(numToRow('2.5', 6, 1)).toEqual(['', '', '', '', '2', '5']);
  });
  it('returns empty row for undefined', () => {
    expect(numToRow(undefined, 6)).toEqual(['', '', '', '', '', '']);
  });
});

describe('rowToNumWithDecimal', () => {
  it('returns "12,60" for decimalPos=2', () => {
    expect(rowToNumWithDecimal(['', '', '1', '2', '6', '0'], 2, 6)).toBe('12,60');
  });
  it('returns "4,20" preserving trailing zero', () => {
    expect(rowToNumWithDecimal(['', '', '', '4', '2', '0'], 2, 6)).toBe('4,20');
  });
  it('returns "24" in integer mode (null)', () => {
    expect(rowToNumWithDecimal(['', '', '', '', '2', '4'], null, 6)).toBe('24');
  });
  it('returns "0" for empty row in integer mode', () => {
    expect(rowToNumWithDecimal(['', '', '', '', '', ''], null, 6)).toBe('0');
  });
  it('returns "2,5" for decimalPos=1', () => {
    expect(rowToNumWithDecimal(['', '', '', '', '2', '5'], 1, 6)).toBe('2,5');
  });
});
