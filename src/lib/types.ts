export type MealSlot = "Breakfast" | "Lunch" | "Dinner";

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
  id: string;
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  note: string;
};

export type Recipe = {
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
  quantity: number;
  unit: string;
  categoryId: string;
  updatedAt: string;
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
