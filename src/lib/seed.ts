import { CATEGORIES } from "@/lib/constants";
import type { Category, PantryItem, InventoryTransaction, Recipe } from "@/lib/types";

interface SeedData {
  categories: Category[];
  recipes: Recipe[];
  pantryItems: PantryItem[];
  inventoryTransactions: InventoryTransaction[];
}

export const INITIAL_DATA: SeedData = {
  categories: CATEGORIES,
  recipes: [],
  pantryItems: [],
  inventoryTransactions: [],
};
