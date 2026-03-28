import type { FullWeekPlan, MealSlot, Recipe, WeekEntry } from "./types";

/** Generates a time-based unique id with a readable prefix. */
export function createId(prefix: string): string {
  return `${prefix}::${Date.now().toString(36)}::${Math.random().toString(36).slice(2, 8)}`;
}

/** Returns the 7 entries (one per day, sorted Mon→Sun) for a given meal slot. */
export function entriesForSlot(weekPlan: FullWeekPlan, slot: MealSlot): WeekEntry[] {
  return weekPlan.entries
    .filter((e) => e.slot === slot)
    .sort((a, b) => a.dayIndex - b.dayIndex);
}

/** Returns a Map from recipe id to Recipe for fast lookup. */
export function recipeById(recipes: Recipe[]): Map<string, Recipe> {
  return new Map(recipes.map((r) => [r.id, r]));
}

/**
 * Formats a quantity + unit into a human-readable string.
 * Trims unnecessary trailing zeros (e.g. 1.50 → "1.5").
 */
export function formatQuantity(quantity: number, unit: string): string {
  const formatted = Number.isInteger(quantity)
    ? quantity.toString()
    : parseFloat(quantity.toFixed(2)).toString();
  return `${formatted} ${unit}`;
}

/** Groups an array of items by their categoryId. */
export function groupByCategory<T extends { categoryId: string }>(
  items: T[],
): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    (result[item.categoryId] ??= []).push(item);
  }
  return result;
}
