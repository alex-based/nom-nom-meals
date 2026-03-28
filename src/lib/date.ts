<<<<<<< HEAD
export function startOfIsoWeek(date: Date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

export function getIsoWeekInfo(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() + 4 - (copy.getDay() || 7));
  const yearStart = new Date(copy.getFullYear(), 0, 1);
  const week = Math.ceil((((copy.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

  return {
    isoYear: copy.getFullYear(),
    isoWeek: week,
  };
}

export function getDateForIsoWeek(isoYear: number, isoWeek: number, dayOffset = 0) {
  const fourthOfJanuary = new Date(isoYear, 0, 4);
  const weekStart = startOfIsoWeek(fourthOfJanuary);
  const date = new Date(weekStart);
  date.setDate(weekStart.getDate() + (isoWeek - 1) * 7 + dayOffset);
  return date;
}

export function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatRange(isoYear: number, isoWeek: number) {
  const start = getDateForIsoWeek(isoYear, isoWeek, 0);
  const end = getDateForIsoWeek(isoYear, isoWeek, 6);

  return `${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(start)} - ${new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(end)}`;
}

export function getWeekOptions(center = new Date(), radius = 12) {
  const start = new Date(center);
  start.setDate(start.getDate() - radius * 7);

  return Array.from({ length: radius * 2 + 1 }, (_, index) => {
    const cursor = new Date(start);
    cursor.setDate(start.getDate() + index * 7);
    const info = getIsoWeekInfo(cursor);

    return {
      label: `Week ${info.isoWeek}, ${info.isoYear} (${formatRange(info.isoYear, info.isoWeek)})`,
      ...info,
    };
  }).filter(
    (option, index, all) =>
      index ===
      all.findIndex(
        (candidate) =>
          candidate.isoYear === option.isoYear && candidate.isoWeek === option.isoWeek,
      ),
  );
=======
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
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
}
