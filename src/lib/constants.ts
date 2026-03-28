import { IngredientCategory, MealSlot } from "@/lib/types";

export const MEAL_SLOTS: MealSlot[] = ["Breakfast", "Lunch", "Dinner"];

export const DIFFICULTIES = ["Easy", "Medium", "Hard"] as const;

export const UNIT_OPTIONS = [
  "pcs",
  "pc",
  "slices",
  "g",
  "kg",
  "ml",
  "l",
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
