/** Shared value-format helpers (FR-073): platform Intl everywhere, one
 *  duration helper so timers read identically on every screen, coin as a
 *  locale-grouped integer with the game's coin mark — never ISO currency. */

import { intlLocale } from './locale.js';

export const COIN_MARK = '¤';

export function formatNumber(appLocale: string, value: number): string {
  return new Intl.NumberFormat(intlLocale(appLocale)).format(value);
}

export function formatCoin(appLocale: string, amount: number): string {
  return `${new Intl.NumberFormat(intlLocale(appLocale), { maximumFractionDigits: 0 }).format(amount)} ${COIN_MARK}`;
}

export function formatDateTime(appLocale: string, epochMs: number): string {
  return new Intl.DateTimeFormat(intlLocale(appLocale), {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(epochMs));
}

interface DurationFormatLike {
  format(d: { days?: number; hours?: number; minutes?: number; seconds?: number }): string;
}

interface IntlWithDuration {
  DurationFormat?: new (locale: string, opts: { style: string }) => DurationFormatLike;
}

export function formatDuration(appLocale: string, totalSeconds: number): string {
  const locale = intlLocale(appLocale);
  const seconds = Math.max(0, Math.round(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: { days?: number; hours?: number; minutes?: number; seconds?: number } = {};
  if (days > 0) parts.days = days;
  if (hours > 0) parts.hours = hours;
  if (minutes > 0) parts.minutes = minutes;
  if (days === 0 && hours === 0 && (secs > 0 || seconds === 0)) parts.seconds = secs;

  const unitFmt = (value: number, unit: 'day' | 'hour' | 'minute' | 'second') =>
    new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'narrow' }).format(value);
  if (seconds === 0) return unitFmt(0, 'second');
  const DurationFormat = (Intl as IntlWithDuration).DurationFormat;
  if (DurationFormat) {
    return new DurationFormat(locale, { style: 'narrow' }).format(parts);
  }
  const out: string[] = [];
  if (parts.days !== undefined) out.push(unitFmt(parts.days, 'day'));
  if (parts.hours !== undefined) out.push(unitFmt(parts.hours, 'hour'));
  if (parts.minutes !== undefined) out.push(unitFmt(parts.minutes, 'minute'));
  if (parts.seconds !== undefined) out.push(unitFmt(parts.seconds, 'second'));
  return out.join(' ');
}
