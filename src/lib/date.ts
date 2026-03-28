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
}
