import type { Category, Difficulty, MealSlot } from "./types";

export const MEAL_SLOTS: readonly MealSlot[] = [
  "Breakfast",
  "Lunch",
  "Dinner",
] as const;

export const DIFFICULTIES: readonly Difficulty[] = [
  "Easy",
  "Medium",
  "Hard",
] as const;

export const UNIT_OPTIONS: readonly string[] = [
  "pcs",
  "g",
  "kg",
  "ml",
  "l",
  "tbsp",
  "tsp",
  "cup",
  "oz",
  "lb",
  "bunch",
  "slice",
  "can",
  "jar",
  "bag",
] as const;

export const CATEGORIES: Category[] = [
  { id: "produce", name: "Produce" },
  { id: "meat-fish", name: "Meat & Fish" },
  { id: "dairy", name: "Dairy" },
  { id: "bakery", name: "Bakery" },
  { id: "pantry", name: "Pantry" },
  { id: "frozen", name: "Frozen" },
  { id: "beverages", name: "Beverages" },
  { id: "other", name: "Other" },
];
