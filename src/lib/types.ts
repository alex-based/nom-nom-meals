export type MealSlot = "Breakfast" | "Lunch" | "Dinner";
<<<<<<< HEAD

export type Difficulty = "Easy" | "Medium" | "Hard";

export type TransactionType =
  | "purchase"
  | "cook_consumption"
  | "leftover_add"
  | "manual_adjustment";

export type IngredientCategory = {
  id: string;
  name: string;
};

export type RecipeIngredient = {
=======
export type Difficulty = "Easy" | "Medium" | "Hard";

export interface Ingredient {
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
  id: string;
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  note: string;
<<<<<<< HEAD
};

export type Recipe = {
=======
}

export interface Recipe {
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
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
<<<<<<< HEAD
  archived: boolean;
  ingredients: RecipeIngredient[];
};

export type WeekEntry = {
  id: string;
  date: string;
  mealSlot: MealSlot;
  recipeId: string | null;
  servings: number;
  notes: string;
  cooked: boolean;
};

export type ManualShoppingItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  note: string;
  bought: boolean;
};

export type WeeklyPlan = {
  id: string;
  isoYear: number;
  isoWeek: number;
  entries: WeekEntry[];
  manualItems: ManualShoppingItem[];
  purchasedAutoItemKeys: string[];
};

export type PantryItem = {
  id: string;
  name: string;
  normalizedName: string;
=======
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
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
  quantity: number;
  unit: string;
  categoryId: string;
  updatedAt: string;
<<<<<<< HEAD
};

export type InventoryTransaction = {
  id: string;
  createdAt: string;
  type: TransactionType;
  itemName: string;
  quantity: number;
  unit: string;
  categoryId: string;
  note: string;
};

export type PlannerData = {
  householdName: string;
  categories: IngredientCategory[];
  recipes: Recipe[];
  weeklyPlans: WeeklyPlan[];
  pantryItems: PantryItem[];
  inventoryTransactions: InventoryTransaction[];
};

export type ShoppingListItem = {
  id: string;
  name: string;
  categoryId: string;
  unit: string;
  needed: number;
  pantryQuantity: number;
  toBuy: number;
  source: "recipe" | "manual";
  note: string;
  bought: boolean;
};

export type RecipeDraft = Omit<Recipe, "id" | "archived"> & {
  id?: string;
};
=======
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
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
