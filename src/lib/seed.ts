import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { PlannerData } from "@/lib/types";

export const INITIAL_DATA: PlannerData = {
  householdName: "Home Table",
  categories: DEFAULT_CATEGORIES,
  recipes: [],
  weeklyPlans: [],
  pantryItems: [],
  inventoryTransactions: [],
};
