"use client";

import { useMemo, useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { MEAL_SLOTS } from "@/lib/constants";
import { formatRange, formatShortDate, getDateForIsoWeek, getIsoWeekInfo, getWeekOptions } from "@/lib/date";
import { entriesForSlot, recipeById } from "@/lib/planner";

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className ?? "inline-block h-3 w-3"}
    >
      <path
        fillRule="evenodd"
        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function stepWeek(isoYear: number, isoWeek: number, direction: 1 | -1) {
  const date = getDateForIsoWeek(isoYear, isoWeek, 0);
  date.setDate(date.getDate() + direction * 7);
  return getIsoWeekInfo(date);
}

const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getMonthCalendarDays(year: number, month: number): Date[] {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const firstDow = (firstDay.getUTCDay() + 6) % 7; // Mon=0
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const numWeeks = Math.ceil((firstDow + lastDay.getUTCDate()) / 7);
  const days: Date[] = [];
  for (let i = 0; i < numWeeks * 7; i++) {
    days.push(new Date(Date.UTC(year, month, 1 - firstDow + i)));
  }
  return days;
}

export function WeekPlanner() {
  const {
    data,
    currentIsoWeek,
    currentIsoYear,
    getWeekPlan,
    getWeekSummary,
    updateWeekEntry,
    markMealCooked,
    addLeftover,
    copyWeekForward,
  } = usePlanner();

  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [selection, setSelection] = useState({
    isoWeek: currentIsoWeek,
    isoYear: currentIsoYear,
  });
  const [monthSel, setMonthSel] = useState(() => {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() };
  });
  const [copyTarget, setCopyTarget] = useState(() => {
    const next = stepWeek(currentIsoYear, currentIsoWeek, 1);
    return { isoWeek: next.isoWeek, isoYear: next.isoYear };
  });
  const [leftoverDrafts, setLeftoverDrafts] = useState<
    Record<string, { name: string; quantity: string; unit: string; categoryId: string }>
  >({});

  const weekPlan = getWeekPlan(selection.isoYear, selection.isoWeek);
  const summary = getWeekSummary(selection.isoYear, selection.isoWeek);
  const recipes = useMemo(
    () => data.recipes.filter((recipe) => !recipe.archived),
    [data.recipes],
  );
  const recipeMap = useMemo(() => recipeById(recipes), [recipes]);
  const weekOptions = getWeekOptions(new Date(), 16);
  const today = new Date();

  const slotOptions = useMemo(
    () =>
      Object.fromEntries(
        MEAL_SLOTS.map((slot) => [slot, recipes.filter((recipe) => recipe.mealType === slot)]),
      ) as Record<(typeof MEAL_SLOTS)[number], typeof recipes>,
    [recipes],
  );

  const monthDays = useMemo(
    () => getMonthCalendarDays(monthSel.year, monthSel.month),
    [monthSel.year, monthSel.month],
  );

  // Pre-compute meals for every day in the month view so the calendar grid
  // doesn't call getWeekPlan + entriesForSlot for every cell on every render.
  const dayMealsMap = useMemo(() => {
    type DayMeal = { slot: string; recipe: (typeof recipes)[number]; cooked: boolean };
    const map = new Map<string, DayMeal[]>();
    for (const date of monthDays) {
      const { isoYear: dayIsoYear, isoWeek: dayIsoWeek } = getIsoWeekInfo(date);
      const dayPlan = getWeekPlan(dayIsoYear, dayIsoWeek);
      const dayIndex = (date.getUTCDay() + 6) % 7;
      const meals = MEAL_SLOTS.map((slot) => {
        const entry = entriesForSlot(dayPlan, slot)[dayIndex];
        const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : null;
        return recipe ? { slot, recipe, cooked: entry.cooked } : null;
      }).filter(Boolean) as DayMeal[];
      map.set(date.toISOString(), meals);
    }
    return map;
  }, [monthDays, getWeekPlan, recipeMap, recipes]);

  const navigate = (direction: 1 | -1) => {
    setSelection((current) => stepWeek(current.isoYear, current.isoWeek, direction));
  };

  const navigateMonth = (direction: 1 | -1) => {
    setMonthSel((current) => {
      let month = current.month + direction;
      let year = current.year;
      if (month < 0) { month = 11; year--; }
      if (month > 11) { month = 0; year++; }
      return { year, month };
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] bg-surface-strong p-5 shadow-[0_14px_40px_rgba(106,79,49,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <h2 className="section-title text-3xl">
                {viewMode === "week"
                  ? `Week ${selection.isoWeek}`
                  : `${MONTH_NAMES[monthSel.month]} ${monthSel.year}`}
              </h2>
              {viewMode === "week" && (
                <p className="section-subtitle text-sm">
                  {formatRange(selection.isoYear, selection.isoWeek)} · three meal slots
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* View toggle */}
              <div className="flex overflow-hidden rounded-2xl border border-line">
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${viewMode === "week" ? "bg-accent text-white" : "button-secondary"}`}
                  onClick={() => setViewMode("week")}
                >
                  Week
                </button>
                <button
                  type="button"
                  className={`px-4 py-2 text-sm font-semibold transition-colors ${viewMode === "month" ? "bg-accent text-white" : "button-secondary"}`}
                  onClick={() => setViewMode("month")}
                >
                  Month
                </button>
              </div>

              {viewMode === "week" ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous week"
                    className="rounded-2xl px-3 py-3 font-semibold button-secondary leading-none"
                    onClick={() => navigate(-1)}
                  >
                    ←
                  </button>
                  <select
                    aria-label="Select week"
                    value={`${selection.isoYear}-${selection.isoWeek}`}
                    onChange={(event) => {
                      const [year, week] = event.target.value.split("-").map(Number);
                      setSelection({ isoYear: year, isoWeek: week });
                    }}
                  >
                    {weekOptions.map((option) => (
                      <option
                        key={`${option.isoYear}-${option.isoWeek}`}
                        value={`${option.isoYear}-${option.isoWeek}`}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Next week"
                    className="rounded-2xl px-3 py-3 font-semibold button-secondary leading-none"
                    onClick={() => navigate(1)}
                  >
                    →
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous month"
                    className="rounded-2xl px-3 py-3 font-semibold button-secondary leading-none"
                    onClick={() => navigateMonth(-1)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label="Next month"
                    className="rounded-2xl px-3 py-3 font-semibold button-secondary leading-none"
                    onClick={() => navigateMonth(1)}
                  >
                    →
                  </button>
                </div>
              )}

              <button
                type="button"
                className="rounded-2xl px-4 py-3 font-semibold button-secondary whitespace-nowrap"
                onClick={() => {
                  setSelection({ isoWeek: currentIsoWeek, isoYear: currentIsoYear });
                  const t = new Date();
                  setMonthSel({ year: t.getFullYear(), month: t.getMonth() });
                }}
              >
                Today
              </button>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-[28px] bg-surface-strong p-5 shadow-[0_14px_40px_rgba(106,79,49,0.08)]">
          <div aria-live="polite" className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-accent-soft p-4">
              <div className="text-2xl font-bold">{summary.plannedMeals}</div>
              <div className="section-subtitle">planned meals</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-2xl font-bold">{summary.itemsToBuy}</div>
              <div className="section-subtitle">items to buy</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-2xl font-bold">{summary.cookedMeals}</div>
              <div className="section-subtitle">meals cooked</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-2xl font-bold">{summary.reusedRecipes}</div>
              <div className="section-subtitle">in rotation</div>
            </div>
          </div>
        </div>
      </section>

      {viewMode === "week" ? (
        <section className="rounded-[30px] bg-surface-strong p-4 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
          {/* Copy week controls */}
          <div className="mb-4 flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-end">
            <select
              aria-label="Copy to week"
              value={`${copyTarget.isoYear}-${copyTarget.isoWeek}`}
              onChange={(event) => {
                const [year, week] = event.target.value.split("-").map(Number);
                setCopyTarget({ isoYear: year, isoWeek: week });
              }}
            >
              {weekOptions.map((option) => (
                <option
                  key={`${option.isoYear}-${option.isoWeek}`}
                  value={`${option.isoYear}-${option.isoWeek}`}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="rounded-2xl px-4 py-3 font-semibold button-primary whitespace-nowrap"
              onClick={() =>
                copyWeekForward(
                  selection.isoYear,
                  selection.isoWeek,
                  copyTarget.isoYear,
                  copyTarget.isoWeek,
                )
              }
            >
              Copy to week
            </button>
          </div>

          {/* GCal-style grid: rows = meal slots, columns = days */}
          <div className="overflow-x-auto pb-2 -mx-1 px-1">
            <div style={{ minWidth: "900px" }}>
              {/* Day header row */}
              <div className="mb-3 grid gap-2" style={{ gridTemplateColumns: "72px repeat(7, 1fr)" }}>
                <div />
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const date = getDateForIsoWeek(selection.isoYear, selection.isoWeek, dayIndex);
                  const isToday =
                    date.getUTCFullYear() === today.getFullYear() &&
                    date.getUTCMonth() === today.getMonth() &&
                    date.getUTCDate() === today.getDate();
                  return (
                    <div
                      key={dayIndex}
                      className={`rounded-2xl px-2 py-2 text-center ${
                        isToday ? "bg-accent text-white" : "border border-line bg-surface"
                      }`}
                    >
                      <div className={`text-xs font-medium ${isToday ? "text-white/80" : "text-muted"}`}>
                        {DAY_ABBR[dayIndex]}
                      </div>
                      <div className="text-lg font-bold leading-tight">{date.getUTCDate()}</div>
                      {isToday && (
                        <div className="mt-0.5 text-[10px] font-semibold text-white/80">Today</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Meal rows */}
              {MEAL_SLOTS.map((slot) => (
                <div
                  key={slot}
                  className="mb-3 grid gap-2"
                  style={{ gridTemplateColumns: "72px repeat(7, 1fr)" }}
                >
                  {/* Row label */}
                  <div className="flex items-start justify-end pr-2 pt-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-muted">
                      {slot}
                    </span>
                  </div>

                  {/* Day cells */}
                  {Array.from({ length: 7 }, (_, dayIndex) => {
                    const date = getDateForIsoWeek(selection.isoYear, selection.isoWeek, dayIndex);
                    const isToday =
                      date.getUTCFullYear() === today.getFullYear() &&
                      date.getUTCMonth() === today.getMonth() &&
                      date.getUTCDate() === today.getDate();
                    const entry = entriesForSlot(weekPlan, slot)[dayIndex];
                    const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : null;
                    const leftoverDraft = leftoverDrafts[entry.id] ?? {
                      name: recipe ? `${recipe.title} leftovers` : "",
                      quantity: "",
                      unit: "pcs",
                      categoryId: "pantry",
                    };

                    return (
                      <div
                        key={dayIndex}
                        className={`space-y-2 rounded-[18px] border p-2 ${
                          isToday
                            ? "border-accent/30 bg-accent-soft/40"
                            : "border-line bg-surface"
                        }`}
                      >
                        <select
                          value={entry.recipeId ?? ""}
                          aria-label={`${slot} recipe for ${DAY_ABBR[dayIndex]}`}
                          onChange={(event) =>
                            updateWeekEntry(selection.isoYear, selection.isoWeek, entry.id, {
                              recipeId: event.target.value || null,
                              cooked: false,
                            })
                          }
                        >
                          <option value="">— pick —</option>
                          {slotOptions[slot].map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.title}
                            </option>
                          ))}
                        </select>

                        {recipe ? (
                          <p className="px-0.5 text-xs leading-tight text-muted">
                            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min ·{" "}
                            {recipe.caloriesPerServing} kcal
                          </p>
                        ) : null}

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={1}
                            step={0.5}
                            value={entry.servings}
                            onChange={(event) =>
                              updateWeekEntry(selection.isoYear, selection.isoWeek, entry.id, {
                                servings: Number(event.target.value),
                              })
                            }
                            aria-label={`${slot} servings`}
                            inputMode="decimal"
                            className="w-14 text-center"
                          />
                          <span className="shrink-0 text-xs text-muted">srv</span>
                        </div>

                        <label
                          className={`flex items-center gap-2 text-xs ${
                            !entry.recipeId ? "opacity-40" : "cursor-pointer"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5"
                            checked={entry.cooked}
                            disabled={!entry.recipeId || entry.cooked}
                            onChange={() =>
                              markMealCooked(selection.isoYear, selection.isoWeek, entry.id)
                            }
                          />
                          <span className={entry.cooked ? "font-semibold text-success" : "text-muted"}>
                            Cooked
                          </span>
                        </label>

                        <input
                          value={entry.notes}
                          placeholder="Note…"
                          aria-label={`${slot} notes`}
                          className="text-xs"
                          onChange={(event) =>
                            updateWeekEntry(selection.isoYear, selection.isoWeek, entry.id, {
                              notes: event.target.value,
                            })
                          }
                        />

                        {entry.cooked ? (
                          <div className="space-y-2 rounded-2xl border border-dashed border-line p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                              Leftovers
                            </p>
                            <input
                              value={leftoverDraft.name}
                              placeholder="Item name"
                              aria-label="Leftover item name"
                              onChange={(event) =>
                                setLeftoverDrafts((current) => ({
                                  ...current,
                                  [entry.id]: { ...leftoverDraft, name: event.target.value },
                                }))
                              }
                            />
                            <div className="grid grid-cols-[1fr_1fr] gap-2">
                              <input
                                type="number"
                                min={0}
                                step={0.5}
                                value={leftoverDraft.quantity}
                                placeholder="Qty"
                                aria-label="Leftover quantity"
                                inputMode="decimal"
                                onChange={(event) =>
                                  setLeftoverDrafts((current) => ({
                                    ...current,
                                    [entry.id]: {
                                      ...leftoverDraft,
                                      quantity: event.target.value,
                                    },
                                  }))
                                }
                              />
                              <select
                                value={leftoverDraft.unit}
                                aria-label="Leftover unit"
                                onChange={(event) =>
                                  setLeftoverDrafts((current) => ({
                                    ...current,
                                    [entry.id]: { ...leftoverDraft, unit: event.target.value },
                                  }))
                                }
                              >
                                <option value="pcs">pcs</option>
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              className="w-full rounded-2xl px-3 py-2 text-sm font-semibold button-ghost"
                              onClick={() => {
                                if (
                                  !leftoverDraft.name.trim() ||
                                  !leftoverDraft.quantity ||
                                  Number(leftoverDraft.quantity) <= 0
                                ) return;
                                addLeftover(
                                  leftoverDraft.name,
                                  Number(leftoverDraft.quantity),
                                  leftoverDraft.unit,
                                  leftoverDraft.categoryId,
                                  `Saved after ${slot.toLowerCase()} on ${formatShortDate(date)}.`,
                                );
                                setLeftoverDrafts((current) => ({
                                  ...current,
                                  [entry.id]: { ...leftoverDraft, quantity: "" },
                                }));
                              }}
                            >
                              Add to pantry
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* Month view */
        <section className="rounded-[30px] bg-surface-strong p-4 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
          {/* Day-of-week header */}
          <div className="mb-2 grid grid-cols-7 gap-2">
            {DAY_ABBR.map((day) => (
              <div
                key={day}
                className="py-2 text-center text-xs font-bold uppercase tracking-wide text-muted"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((date, i) => {
              const isCurrentMonth = date.getUTCMonth() === monthSel.month;
              const isToday =
                date.getUTCFullYear() === today.getFullYear() &&
                date.getUTCMonth() === today.getMonth() &&
                date.getUTCDate() === today.getDate();

              const plannedMeals = dayMealsMap.get(date.toISOString()) ?? [];

              return (
                <div
                  key={i}
                  className={`min-h-[90px] rounded-[18px] border p-2 ${
                    isToday
                      ? "border-accent bg-accent-soft"
                      : isCurrentMonth
                        ? "border-line bg-surface"
                        : "border-transparent bg-surface/40"
                  }`}
                >
                  <div
                    className={`mb-1 text-sm font-semibold ${
                      isToday
                        ? "text-accent-strong"
                        : isCurrentMonth
                          ? ""
                          : "text-muted/40"
                    }`}
                  >
                    {isToday ? (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                        {date.getUTCDate()}
                      </span>
                    ) : (
                      date.getUTCDate()
                    )}
                  </div>
                  <div className="space-y-1">
                    {plannedMeals.map(({ slot, recipe, cooked }) => (
                      <div
                        key={slot}
                        className={`flex items-center gap-1 truncate rounded-lg px-1.5 py-0.5 text-[10px] font-medium ${
                          cooked
                            ? "bg-success/15 text-success"
                            : "bg-accent-soft text-accent-strong"
                        }`}
                      >
                        {cooked && <CheckIcon className="inline-block h-2.5 w-2.5 shrink-0" />}
                        <span className="truncate">{recipe.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
