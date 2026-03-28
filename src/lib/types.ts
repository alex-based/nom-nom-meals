export type MealSlot = "Breakfast" | "Lunch" | "Dinner";
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  note: string;
}

export interface Recipe {
  id: string;
  title: string;
  mealType: MealSlot;
  baseServings: number;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  caloriesPerServing: number;
  difficulty: Difficulty;
  vegetarian: boolean;
  highProtein: boolean;
  budgetFriendly: boolean;
  tags: string[];
  comments: string;
  instructions: string;
  ingredients: Ingredient[];
  archived: boolean;
}

/** Mutable draft used in the recipe form. Includes optional id for edits. */
export type RecipeDraft = Omit<Recipe, "id" | "archived"> & { id?: string };

export interface Category {
  id: string;
  name: string;
}

export interface WeekEntry {
  id: string;
  slot: MealSlot;
  dayIndex: number;
  recipeId: string | null;
  servings: number;
  cooked: boolean;
  notes: string;
}

export interface FullWeekPlan {
  isoYear: number;
  isoWeek: number;
  entries: WeekEntry[];
}

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  updatedAt: string;
}

export interface InventoryTransaction {
  id: string;
  itemName: string;
  quantity: number;
  unit: string;
  type: string;
  note: string;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  unit: string;
  categoryId: string;
  needed: number;
  pantryQuantity: number;
  toBuy: number;
  bought: boolean;
  note: string;
  source: "recipe" | "manual";
}
