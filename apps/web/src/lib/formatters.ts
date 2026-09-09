import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatCurrency(
  val: string | number | null | undefined,
  currency = 'USD',
  showPlusSign = false,
): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '—';

  const formatted = Math.abs(num).toLocaleString('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (num > 0) {
    return showPlusSign ? `+${formatted}` : formatted;
  }
  if (num < 0) {
    return `-${formatted}`;
  }
  return formatted;
}

export function formatR(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '—';

  const sign = num > 0 ? '+' : '';
  return `${sign}${num.toFixed(2)}R`;
}

export function formatPercentage(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === '') return '—';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '—';
  return `${(num * 100).toFixed(1)}%`;
}

export function formatDate(
  dateStr: string | Date | null | undefined,
  format = 'ddd, MMM D, YYYY',
): string {
  if (!dateStr) return '—';
  return dayjs(dateStr).format(format);
}

export function formatTime(
  isoStr: string | null | undefined,
  tz = 'Asia/Kathmandu',
  format = 'HH:mm',
): string {
  if (!isoStr) return '—';
  try {
    return dayjs(isoStr).tz(tz).format(format);
  } catch {
    return dayjs(isoStr).format(format);
  }
}

export function formatDateTime(
  isoStr: string | null | undefined,
  tz = 'Asia/Kathmandu',
  format = 'YYYY-MM-DD HH:mm',
): string {
  if (!isoStr) return '—';
  try {
    return dayjs(isoStr).tz(tz).format(format);
  } catch {
    return dayjs(isoStr).format(format);
  }
}

export function getDailyGradeColor(grade?: string | null): string {
  switch (grade) {
    case 'A':
      return 'teal';
    case 'B':
      return 'blue';
    case 'C':
      return 'orange';
    case 'D':
      return 'red';
    default:
      return 'gray';
  }
}

export function getOutcomeBadge(outcome?: string | null, isGoodLoss?: boolean, isBadWin?: boolean) {
  if (isGoodLoss) {
    return { color: 'teal', label: 'Good Loss', variant: 'light' as const };
  }
  if (isBadWin) {
    return { color: 'orange', label: 'Bad Win', variant: 'light' as const };
  }

  switch (outcome) {
    case 'WIN':
      return { color: 'teal', label: '+ WIN', variant: 'filled' as const };
    case 'LOSS':
      return { color: 'red', label: '- LOSS', variant: 'filled' as const };
    case 'BREAKEVEN':
      return { color: 'gray', label: '0 BE', variant: 'light' as const };
    default:
      return { color: 'gray', label: outcome || 'PENDING', variant: 'outline' as const };
  }
}
