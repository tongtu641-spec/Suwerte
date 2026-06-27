import { describe, it, expect } from 'vitest';
import {
  toStroops,
  fromStroops,
  formatAmount,
  addStroops,
  shortKey,
  ticketsForStroops,
} from '../../src/lib/format';

describe('stroop conversion', () => {
  it('converts whole and fractional units', () => {
    expect(toStroops('1')).toBe('10000000');
    expect(toStroops('2.5')).toBe('25000000');
    expect(toStroops('0.0000001')).toBe('1');
  });

  it('round-trips', () => {
    expect(fromStroops(toStroops('123.456'))).toBe('123.456');
    expect(fromStroops('10000000')).toBe('1');
    expect(fromStroops('0')).toBe('0');
  });

  it('rejects invalid amounts', () => {
    expect(() => toStroops('abc')).toThrow();
    expect(() => toStroops('-1')).toThrow();
  });
});

describe('formatAmount', () => {
  it('groups thousands and trims zeros', () => {
    expect(formatAmount('12345000000')).toBe('1,234.5');
    expect(formatAmount('10000000')).toBe('1');
  });
});

describe('helpers', () => {
  it('adds stroops as bigint', () => {
    expect(addStroops('10000000', '5000000')).toBe('15000000');
  });

  it('shortens keys', () => {
    expect(shortKey('GABCDEFGHIJKLMNOP')).toBe('GABC…MNOP');
    expect(shortKey(null)).toBe('—');
  });

  it('tickets are 1 per whole unit, min 1', () => {
    expect(ticketsForStroops('5000000')).toBe(1); // 0.5 -> min 1
    expect(ticketsForStroops('30000000')).toBe(3);
    expect(ticketsForStroops('10000000')).toBe(1);
  });
});
