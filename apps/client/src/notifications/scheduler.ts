import { createIntl, createIntlCache } from 'react-intl';
import { messagesFor } from '../i18n/catalogs.js';

/** V1 device-scheduled notification delivery (FR-064, research R15). Delivery is
 *  best-effort: foreground timers fire while the installed PWA is alive; true
 *  background delivery arrives with V2 Web Push. Text is composed from each
 *  category's `ui.json` template keys in the active locale (FR-076). */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** On iPhone, notifications need the app installed to the home screen. */
export function iosNeedsInstall(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone =
    (window.navigator as { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true;
  return ios && !standalone;
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

export interface PendingMoment {
  categoryId: string;
  fireAtTick: number;
  settlementId: string | null;
}

export interface ScheduleContext {
  currentTick: number;
  tickSeconds: number;
  locale: string;
}

const cache = createIntlCache();
let timers: number[] = [];

export function clearScheduledNotifications(): void {
  for (const t of timers) clearTimeout(t);
  timers = [];
}

export function scheduleNotifications(moments: PendingMoment[], ctx: ScheduleContext): void {
  clearScheduledNotifications();
  if (!notificationsSupported() || Notification.permission !== 'granted') return;
  const intl = createIntl({ locale: ctx.locale, messages: messagesFor(ctx.locale) }, cache);
  for (const m of moments) {
    const delayMs = (m.fireAtTick - ctx.currentTick) * ctx.tickSeconds * 1000;
    if (delayMs <= 0) continue;
    const title = intl.formatMessage({ id: `notify.${m.categoryId}.title` });
    const body = intl.formatMessage(
      { id: `notify.${m.categoryId}.body` },
      m.settlementId ? { settlement: intl.formatMessage({ id: `${m.settlementId}.name` }) } : {},
    );
    timers.push(
      window.setTimeout(() => {
        try {
          new Notification(title, { body });
        } catch {
          /* best-effort: ignore delivery failures */
        }
      }, delayMs),
    );
  }
}
