import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatDateTime(
  dateInput: string | Date | null | undefined,
  formatString: string = "dd MMM yyyy, hh:mm a"
): string {
  if (!dateInput) return "—";
  try {
    const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";
    return format(date, formatString);
  } catch (err) {
    return "—";
  }
}

export function formatDateOnly(dateInput: string | Date | null | undefined): string {
  return formatDateTime(dateInput, "dd MMM yyyy");
}

export function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  try {
    const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (err) {
    return "—";
  }
}

export function formatLiveDate(date: Date = new Date()): string {
  try {
    return format(date, "EEEE, dd MMMM yyyy");
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatShortLiveDate(date: Date = new Date()): string {
  try {
    return format(date, "dd MMM yyyy");
  } catch {
    return date.toLocaleDateString();
  }
}

export function formatLiveClock(date: Date = new Date()): string {
  try {
    return format(date, "hh:mm:ss a");
  } catch {
    return date.toLocaleTimeString();
  }
}

export function getRecentDays(count: number = 7) {
  const days = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({
      day: format(d, "EEE"),
      date: format(d, "MMM dd"),
      fullDate: d,
    });
  }
  return days;
}

export function getSampleIsoDate(dateInput: string | Date | null | undefined): string | null {
  if (!dateInput) return null;
  try {
    const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;
    if (isNaN(date.getTime())) return null;
    return format(date, "yyyy-MM-dd");
  } catch {
    return null;
  }
}

export function matchesDateFilter(dateInput: string | Date | null | undefined, filter: string | null | undefined): boolean {
  return matchesDateRangeFilter(dateInput, filter);
}

export function matchesDateRangeFilter(
  dateInput: string | Date | null | undefined,
  filterKey: string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  if (!filterKey || filterKey === 'ALL') return true;
  if (!dateInput) return false;

  const itemDate = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
  if (isNaN(itemDate.getTime())) return false;

  const itemIso = getSampleIsoDate(itemDate);
  if (!itemIso) return false;

  // Exact calendar date string YYYY-MM-DD (e.g. 2026-11-16)
  if (/^\d{4}-\d{2}-\d{2}$/.test(filterKey)) {
    return itemIso === filterKey;
  }

  // Month-wise filter string YYYY-MM (e.g. 2026-11)
  if (/^\d{4}-\d{2}$/.test(filterKey)) {
    return itemIso.startsWith(filterKey);
  }

  const todayIso = getSampleIsoDate(referenceDate);
  const yesterday = new Date(referenceDate);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayIso = getSampleIsoDate(yesterday);

  switch (filterKey.toUpperCase()) {
    case 'TODAY':
      return itemIso === todayIso;

    case 'YESTERDAY':
      return itemIso === yesterdayIso;

    case 'WEEK': {
      const diffDays = (referenceDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= -0.5 && diffDays <= 7.5;
    }

    case 'MONTH': {
      return (
        itemDate.getFullYear() === referenceDate.getFullYear() &&
        itemDate.getMonth() === referenceDate.getMonth()
      );
    }

    case 'YEAR': {
      return itemDate.getFullYear() === referenceDate.getFullYear();
    }

    default:
      return true;
  }
}

