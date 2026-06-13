import { describe, expect, it } from 'vitest';
import { formatCoin, formatDuration, formatNumber, formatDateTime, COIN_MARK } from './format.js';

describe('locale value formatting (FR-073)', () => {
  it('groups numbers per locale convention with identical underlying values', () => {
    expect(formatNumber('en', 1234567)).toBe('1,234,567');
    expect(formatNumber('de', 1234567)).toBe('1.234.567');
  });

  it('formats coin as locale-grouped integer with the coin mark, never ISO currency', () => {
    const en = formatCoin('en', 12345);
    const de = formatCoin('de', 12345);
    expect(en).toContain('12,345');
    expect(de).toContain('12.345');
    expect(en).toContain(COIN_MARK);
    expect(de).toContain(COIN_MARK);
    expect(en).not.toMatch(/USD|EUR|\$|€/);
  });

  it('formats durations through one shared helper', () => {
    const twoAndAHalfHours = formatDuration('en', 2 * 3600 + 30 * 60);
    expect(twoAndAHalfHours).toMatch(/2/);
    expect(twoAndAHalfHours).toMatch(/30/);
    const seconds = formatDuration('en', 45);
    expect(seconds).toMatch(/45/);
    expect(formatDuration('en', 0)).toMatch(/0/);
  });

  it('formats dates per locale', () => {
    const ms = Date.UTC(2026, 5, 12, 12, 0, 0);
    const en = formatDateTime('en', ms);
    const de = formatDateTime('de', ms);
    expect(en).not.toBe(de);
  });
});
