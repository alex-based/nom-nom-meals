/** Returns the ISO week year and week number for a given date. */
export function getIsoWeekInfo(date: Date): { isoYear: number; isoWeek: number } {
  // Work in UTC to avoid DST shifts
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // 1=Mon … 7=Sun
  // Move to the nearest Thursday (determines the ISO year of the week)
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek);
  const isoYear = d.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const isoWeek = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return { isoYear, isoWeek };
}

/**
 * Returns a UTC Date for the given ISO year, week and day index.
 * dayIndex: 0 = Monday … 6 = Sunday
 */
export function getDateForIsoWeek(isoYear: number, isoWeek: number, dayIndex: number): Date {
  // Jan 4th is always in ISO week 1
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4IsoDay = jan4.getUTCDay() || 7; // 1=Mon
  // Monday of week 1
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - (jan4IsoDay - 1));
  // Target day
  const result = new Date(week1Monday);
  result.setUTCDate(week1Monday.getUTCDate() + (isoWeek - 1) * 7 + dayIndex);
  return result;
}

/** Formats the Monday–Sunday range of an ISO week, e.g. "Mar 16 – Mar 22". */
export function formatRange(isoYear: number, isoWeek: number): string {
  const monday = getDateForIsoWeek(isoYear, isoWeek, 0);
  const sunday = getDateForIsoWeek(isoYear, isoWeek, 6);
  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(monday)} – ${fmt.format(sunday)}`;
}

/** Formats a date as a short weekday + date string, e.g. "Mon, Mar 16". */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export interface WeekOption {
  isoYear: number;
  isoWeek: number;
  label: string;
}

/**
 * Returns `count` week options centered on the week containing `referenceDate`.
 * The first half of the options are in the past, the second half in the future.
 */
export function getWeekOptions(referenceDate: Date, count: number): WeekOption[] {
  const { isoYear: refYear, isoWeek: refWeek } = getIsoWeekInfo(referenceDate);
  const half = Math.floor(count / 2);
  const results: WeekOption[] = [];

  for (let offset = -half; offset < count - half; offset++) {
    const monday = getDateForIsoWeek(refYear, refWeek, 0);
    monday.setUTCDate(monday.getUTCDate() + offset * 7);
    const { isoYear, isoWeek } = getIsoWeekInfo(monday);
    const range = formatRange(isoYear, isoWeek);
    results.push({
      isoYear,
      isoWeek,
      label: `Week ${isoWeek}, ${isoYear} · ${range}`,
    });
  }

  return results;
}
