<<<<<<< HEAD
import { IngredientCategory, MealSlot } from "@/lib/types";

export const MEAL_SLOTS: MealSlot[] = ["Breakfast", "Lunch", "Dinner"];

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export const UNIT_OPTIONS = [
  "pcs",
  "pc",
  "slices",
=======
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
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
  "g",
  "kg",
  "ml",
  "l",
<<<<<<< HEAD
  "tsp",
  "tbsp",
  "cloves",
  "cups",
  "pinch",
] as const;

export const DEFAULT_CATEGORIES: IngredientCategory[] = [
  { id: "produce", name: "Produce" },
  { id: "protein", name: "Protein" },
  { id: "dairy", name: "Dairy & Eggs" },
  { id: "bakery", name: "Bakery" },
  { id: "grains", name: "Grains & Pasta" },
  { id: "pantry", name: "Pantry Staples" },
  { id: "freezer", name: "Freezer" },
  { id: "snacks", name: "Snacks" },
  { id: "drinks", name: "Drinks" },
  { id: "household", name: "Household" },
];

export const LOCAL_STORAGE_KEY = "family-meal-planner-state-v1";
=======
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
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
