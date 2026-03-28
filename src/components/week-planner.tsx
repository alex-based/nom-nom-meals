"use client";

import { useState } from "react";
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
  const [selection, setSelection] = useState({
    isoWeek: currentIsoWeek,
    isoYear: currentIsoYear,
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
  const recipes = data.recipes.filter((recipe) => !recipe.archived);
  const recipeMap = recipeById(recipes);
  const weekOptions = getWeekOptions(new Date(), 16);
  const today = new Date();

  const slotOptions = Object.fromEntries(
    MEAL_SLOTS.map((slot) => [slot, recipes.filter((recipe) => recipe.mealType === slot)]),
  ) as Record<(typeof MEAL_SLOTS)[number], typeof recipes>;

  const navigate = (direction: 1 | -1) => {
    setSelection((current) => stepWeek(current.isoYear, current.isoWeek, direction));
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] bg-surface-strong p-5 shadow-[0_14px_40px_rgba(106,79,49,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="pill inline-flex w-fit text-xs uppercase tracking-[0.24em] text-muted">
                Weekly View
              </p>
              <h2 className="section-title text-3xl">Week {selection.isoWeek}</h2>
              <p className="section-subtitle text-sm">
                {formatRange(selection.isoYear, selection.isoWeek)} · three meal slots · flexible
                servings
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
              <button
                type="button"
                className="rounded-2xl px-4 py-3 font-semibold button-secondary whitespace-nowrap"
                onClick={() =>
                  setSelection({ isoWeek: currentIsoWeek, isoYear: currentIsoYear })
                }
              >
                Today
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] bg-surface-strong p-5 shadow-[0_14px_40px_rgba(106,79,49,0.08)]">
          <p className="pill inline-flex w-fit text-xs uppercase tracking-[0.24em] text-muted">
            This week
          </p>
          <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 text-sm">
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
              <div className="section-subtitle">recipes in rotation</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-surface-strong p-4 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
        <div className="mb-4 flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="section-title text-2xl">Plan meals by day</h3>
            <p className="section-subtitle text-sm">
              Reuse recipes freely and scale servings per meal.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
        </div>

        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="grid grid-cols-7 gap-3" style={{ minWidth: "1120px" }}>
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const date = getDateForIsoWeek(selection.isoYear, selection.isoWeek, dayIndex);
            // date is UTC midnight; compare against local calendar date of today
            const isToday =
              date.getUTCFullYear() === today.getFullYear() &&
              date.getUTCMonth() === today.getMonth() &&
              date.getUTCDate() === today.getDate();

            return (
              <article
                key={date.toISOString()}
                className={`rounded-[26px] border p-3 ${
                  isToday
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-white/70"
                }`}
              >
                <div className="mb-3">
                  <p className={`text-xs font-semibold ${isToday ? "text-accent-strong" : "text-muted"}`}>
                    {formatShortDate(date)}
                  </p>
                  {isToday ? (
                    <span className="mt-1 inline-block text-xs font-semibold rounded-full bg-accent text-white px-2 py-0.5">Today</span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {MEAL_SLOTS.map((slot) => {
                    const entry = entriesForSlot(weekPlan, slot)[dayIndex];
                    const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : null;
                    const leftoverDraft = leftoverDrafts[entry.id] ?? {
                      name: recipe ? `${recipe.title} leftovers` : "",
                      quantity: "",
                      unit: "pcs",
                      categoryId: "pantry",
                    };

                    return (
                      <div key={slot} className="space-y-2 rounded-[18px] bg-surface p-2.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted">{slot}</p>
                          {entry.cooked ? (
                            <span className="flex items-center gap-0.5 text-xs font-semibold text-success">
                              <CheckIcon />
                              <span>done</span>
                            </span>
                          ) : null}
                        </div>

                        <select
                          value={entry.recipeId ?? ""}
                          aria-label={`${slot} recipe for ${formatShortDate(date)}`}
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
                          <p className="text-xs text-muted leading-tight px-0.5">
                            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min · {recipe.caloriesPerServing} kcal
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
                            placeholder="×"
                            aria-label={`${slot} servings`}
                            inputMode="decimal"
                            className="w-14 text-center"
                          />
                          <span className="text-xs text-muted shrink-0">srv</span>
                        </div>

                        <button
                          type="button"
                          className="w-full rounded-xl px-2 py-1.5 text-xs font-semibold button-secondary disabled:opacity-40"
                          disabled={!entry.recipeId || entry.cooked}
                          onClick={() =>
                            markMealCooked(selection.isoYear, selection.isoWeek, entry.id)
                          }
                        >
                          {entry.cooked ? (
                            <span className="flex items-center justify-center gap-1">
                              <CheckIcon />
                              Cooked
                            </span>
                          ) : (
                            "Mark cooked"
                          )}
                        </button>

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
                                placeholder="Quantity"
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
                                if (!leftoverDraft.name || !leftoverDraft.quantity) return;
                                addLeftover(
                                  leftoverDraft.name,
                                  Number(leftoverDraft.quantity),
                                  leftoverDraft.unit,
                                  leftoverDraft.categoryId,
                                  `Saved after ${slot.toLowerCase()} on ${formatShortDate(date)}.`,
                                );
                                setLeftoverDrafts((current) => ({
                                  ...current,
                                  [entry.id]: {
                                    ...leftoverDraft,
                                    quantity: "",
                                  },
                                }));
                              }}
                            >
                              Add leftovers to pantry
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
          </div>
        </div>
      </section>
    </div>
  );
}
