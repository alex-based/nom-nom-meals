<<<<<<< HEAD
import { MEAL_SLOTS } from "@/lib/constants";
import { getDateForIsoWeek } from "@/lib/date";
import {
  InventoryTransaction,
  MealSlot,
  PantryItem,
  PlannerData,
  Recipe,
  ShoppingListItem,
  WeeklyPlan,
} from "@/lib/types";

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function createEmptyWeekPlan(isoYear: number, isoWeek: number): WeeklyPlan {
  const entries = MEAL_SLOTS.flatMap((slot) =>
    Array.from({ length: 7 }, (_, dayIndex) => ({
      id: createId("entry"),
      date: getDateForIsoWeek(isoYear, isoWeek, dayIndex).toISOString(),
      mealSlot: slot,
      recipeId: null,
      servings: 1,
      notes: "",
      cooked: false,
    })),
  );

  return {
    id: createId("week"),
    isoYear,
    isoWeek,
    entries,
    manualItems: [],
    purchasedAutoItemKeys: [],
  };
}

export function getOrCreateWeekPlan(data: PlannerData, isoYear: number, isoWeek: number) {
  return (
    data.weeklyPlans.find((plan) => plan.isoYear === isoYear && plan.isoWeek === isoWeek) ??
    createEmptyWeekPlan(isoYear, isoWeek)
  );
}

function pantryLookup(pantryItems: PantryItem[]) {
  return new Map(
    pantryItems.map((item) => [`${item.normalizedName}::${item.unit}`, item.quantity]),
  );
}

export function recipeById(recipes: Recipe[]) {
  return new Map(recipes.map((recipe) => [recipe.id, recipe]));
}

export function buildShoppingList(
  data: PlannerData,
  isoYear: number,
  isoWeek: number,
): ShoppingListItem[] {
  const week = getOrCreateWeekPlan(data, isoYear, isoWeek);
  const recipeMap = recipeById(data.recipes);
  const pantry = pantryLookup(data.pantryItems);
  const aggregated = new Map<string, ShoppingListItem>();

  week.entries.forEach((entry) => {
    if (!entry.recipeId) return;

    const recipe = recipeMap.get(entry.recipeId);
    if (!recipe) return;

    const scale = entry.servings / Math.max(recipe.baseServings, 1);
    recipe.ingredients.forEach((ingredient) => {
      const normalized = normalizeName(ingredient.name);
      const key = `${normalized}::${ingredient.unit}`;
      const current = aggregated.get(key);
      const needed = ingredient.quantity * scale;

      const existingNote = current?.note ?? "";
      const note = existingNote
        ? existingNote.includes(recipe.title)
          ? existingNote
          : `${existingNote}, ${recipe.title}`
        : recipe.title;

      aggregated.set(key, {
        id: key,
        name: ingredient.name,
        categoryId: ingredient.categoryId,
        unit: ingredient.unit,
        needed: (current?.needed ?? 0) + needed,
        pantryQuantity: pantry.get(key) ?? 0,
        toBuy: 0,
        source: "recipe",
        note,
        bought: week.purchasedAutoItemKeys.includes(key),
      });
    });
  });

  week.manualItems.forEach((item) => {
    aggregated.set(`manual::${item.id}`, {
      id: `manual::${item.id}`,
      name: item.name,
      categoryId: item.categoryId,
      unit: item.unit,
      needed: item.quantity,
      pantryQuantity: pantry.get(`${normalizeName(item.name)}::${item.unit}`) ?? 0,
      toBuy: 0,
      source: "manual",
      note: item.note,
      bought: item.bought,
    });
  });

  return Array.from(aggregated.values())
    .map((item) => ({
      ...item,
      needed: round(item.needed),
      pantryQuantity: round(item.pantryQuantity),
      toBuy: round(Math.max(item.needed - item.pantryQuantity, 0)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function summarizeWeek(data: PlannerData, isoYear: number, isoWeek: number) {
  const week = getOrCreateWeekPlan(data, isoYear, isoWeek);
  const shopping = buildShoppingList(data, isoYear, isoWeek);

  return {
    plannedMeals: week.entries.filter((entry) => entry.recipeId).length,
    cookedMeals: week.entries.filter((entry) => entry.cooked).length,
    reusedRecipes: new Set(week.entries.map((entry) => entry.recipeId).filter(Boolean)).size,
    itemsToBuy: shopping.filter((item) => item.toBuy > 0 && !item.bought).length,
  };
}

export function addToPantry(
  pantryItems: PantryItem[],
  itemName: string,
  quantity: number,
  unit: string,
  categoryId: string,
) {
  const normalized = normalizeName(itemName);
  const existing = pantryItems.find(
    (item) => item.normalizedName === normalized && item.unit === unit,
  );

  if (existing) {
    return pantryItems.map((item) =>
      item.id === existing.id
        ? {
            ...item,
            quantity: round(item.quantity + quantity),
            categoryId,
            updatedAt: new Date().toISOString(),
          }
        : item,
    );
  }

  return [
    ...pantryItems,
    {
      id: createId("pantry"),
      name: itemName,
      normalizedName: normalized,
      quantity: round(quantity),
      unit,
      categoryId,
      updatedAt: new Date().toISOString(),
    },
  ];
}

export function subtractFromPantry(
  pantryItems: PantryItem[],
  itemName: string,
  quantity: number,
  unit: string,
  categoryId: string,
) {
  const normalized = normalizeName(itemName);
  const existing = pantryItems.find(
    (item) => item.normalizedName === normalized && item.unit === unit,
  );

  if (!existing) return pantryItems;

  return pantryItems
    .map((item) =>
      item.id === existing.id
        ? {
            ...item,
            quantity: round(Math.max(item.quantity - quantity, 0)),
            categoryId,
            updatedAt: new Date().toISOString(),
          }
        : item,
    )
    .filter((item) => item.quantity > 0);
}

export function copyWeekPlan(source: WeeklyPlan, targetYear: number, targetWeek: number) {
  const target = createEmptyWeekPlan(targetYear, targetWeek);
  const entryMap = new Map<string, { recipeId: string | null; servings: number; notes: string }>();

  source.entries.forEach((entry) => {
    const date = new Date(entry.date);
    const dayIndex = (date.getDay() + 6) % 7;
    entryMap.set(`${entry.mealSlot}-${dayIndex}`, {
      recipeId: entry.recipeId,
      servings: entry.servings,
      notes: entry.notes,
    });
  });

  target.entries = target.entries.map((entry) => {
    const date = new Date(entry.date);
    const dayIndex = (date.getDay() + 6) % 7;
    const template = entryMap.get(`${entry.mealSlot}-${dayIndex}`);
    if (!template) return entry;

    return {
      ...entry,
      recipeId: template.recipeId,
      servings: template.servings,
      notes: template.notes,
      cooked: false,
    };
  });

  target.manualItems = source.manualItems.map((item) => ({
    ...item,
    id: createId("manual"),
    bought: false,
  }));
  target.purchasedAutoItemKeys = [];

  return target;
}

export function createTransaction(
  type: InventoryTransaction["type"],
  itemName: string,
  quantity: number,
  unit: string,
  categoryId: string,
  note: string,
): InventoryTransaction {
  return {
    id: createId("tx"),
    createdAt: new Date().toISOString(),
    type,
    itemName,
    quantity: round(quantity),
    unit,
    categoryId,
    note,
  };
}

export function groupByCategory<T extends { categoryId: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((accumulator, item) => {
    accumulator[item.categoryId] ??= [];
    accumulator[item.categoryId].push(item);
    return accumulator;
  }, {});
}

export function formatQuantity(value: number, unit: string) {
  return `${round(value)} ${unit}`.trim();
}

export function entriesForSlot(week: WeeklyPlan, mealSlot: MealSlot) {
  return week.entries
    .filter((entry) => entry.mealSlot === mealSlot)
    .toSorted((left, right) => left.date.localeCompare(right.date));
=======
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
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
}
