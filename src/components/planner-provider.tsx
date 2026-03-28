"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { LOCAL_STORAGE_KEY } from "@/lib/constants";
import { getIsoWeekInfo } from "@/lib/date";
import {
  addToPantry,
  buildShoppingList,
  copyWeekPlan,
  createId,
  createTransaction,
  getOrCreateWeekPlan,
  subtractFromPantry,
  summarizeWeek,
} from "@/lib/planner";
import { INITIAL_DATA } from "@/lib/seed";
import {
  IngredientCategory,
  ManualShoppingItem,
  PlannerData,
  Recipe,
  RecipeDraft,
  WeeklyPlan,
} from "@/lib/types";

type PlannerContextValue = {
  data: PlannerData;
  ready: boolean;
  currentIsoWeek: number;
  currentIsoYear: number;
  categories: IngredientCategory[];
  getWeekPlan: (isoYear: number, isoWeek: number) => WeeklyPlan;
  getShoppingList: (isoYear: number, isoWeek: number) => ReturnType<typeof buildShoppingList>;
  getWeekSummary: (isoYear: number, isoWeek: number) => ReturnType<typeof summarizeWeek>;
  createOrUpdateRecipe: (draft: RecipeDraft) => void;
  archiveRecipe: (recipeId: string) => void;
  updateWeekEntry: (
    isoYear: number,
    isoWeek: number,
    entryId: string,
    updates: Partial<WeeklyPlan["entries"][number]>,
  ) => void;
  copyWeekForward: (
    sourceYear: number,
    sourceWeek: number,
    targetYear: number,
    targetWeek: number,
  ) => void;
  addManualShoppingItem: (
    isoYear: number,
    isoWeek: number,
    draft: Omit<ManualShoppingItem, "id" | "bought">,
  ) => void;
  markShoppingItemBought: (isoYear: number, isoWeek: number, itemId: string) => void;
  addPantryAdjustment: (
    itemName: string,
    quantity: number,
    unit: string,
    categoryId: string,
    note: string,
  ) => void;
  updatePantryItem: (itemId: string, quantity: number) => void;
  markMealCooked: (isoYear: number, isoWeek: number, entryId: string) => void;
  addLeftover: (
    itemName: string,
    quantity: number,
    unit: string,
    categoryId: string,
    note: string,
  ) => void;
  removePantryItem: (itemId: string) => void;
  duplicateRecipe: (recipeId: string) => void;
  removeManualShoppingItem: (isoYear: number, isoWeek: number, itemId: string) => void;
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

function parseStoredData(raw: string | null) {
  if (!raw) return INITIAL_DATA;

  try {
    const parsed = JSON.parse(raw) as PlannerData;
    return {
      ...INITIAL_DATA,
      ...parsed,
      categories: parsed.categories.length ? parsed.categories : INITIAL_DATA.categories,
    };
  } catch {
    return INITIAL_DATA;
  }
}

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const todayInfo = getIsoWeekInfo(new Date());
  const ready = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [data, setData] = useState<PlannerData>(() =>
    parseStoredData(typeof window === "undefined" ? null : window.localStorage.getItem(LOCAL_STORAGE_KEY)),
  );

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const setPlannerData = (updater: (current: PlannerData) => PlannerData) => {
    startTransition(() => {
      setData((current) => updater(current));
    });
  };

  const value = useMemo<PlannerContextValue>(() => {
    const getWeekPlan = (isoYear: number, isoWeek: number) =>
      getOrCreateWeekPlan(data, isoYear, isoWeek);
    const getShopping = (isoYear: number, isoWeek: number) =>
      buildShoppingList(data, isoYear, isoWeek);
    const getSummary = (isoYear: number, isoWeek: number) =>
      summarizeWeek(data, isoYear, isoWeek);

    return {
      data,
      ready,
      currentIsoWeek: todayInfo.isoWeek,
      currentIsoYear: todayInfo.isoYear,
      categories: data.categories,
      getWeekPlan,
      getShoppingList: getShopping,
      getWeekSummary: getSummary,
      createOrUpdateRecipe: (draft) => {
        setPlannerData((current) => {
          const recipe: Recipe = {
            ...draft,
            id: draft.id ?? createId("recipe"),
            archived: false,
          };
          const recipes = current.recipes.some((item) => item.id === recipe.id)
            ? current.recipes.map((item) => (item.id === recipe.id ? recipe : item))
            : [recipe, ...current.recipes];

          return {
            ...current,
            recipes,
          };
        });
      },
      archiveRecipe: (recipeId) => {
        setPlannerData((current) => ({
          ...current,
          recipes: current.recipes.map((recipe) =>
            recipe.id === recipeId ? { ...recipe, archived: true } : recipe,
          ),
        }));
      },
      updateWeekEntry: (isoYear, isoWeek, entryId, updates) => {
        setPlannerData((current) => {
          const week = getOrCreateWeekPlan(current, isoYear, isoWeek);
          const nextWeek = {
            ...week,
            entries: week.entries.map((entry) =>
              entry.id === entryId ? { ...entry, ...updates } : entry,
            ),
          };
          const weeklyPlans = current.weeklyPlans.some((plan) => plan.id === week.id)
            ? current.weeklyPlans.map((plan) => (plan.id === week.id ? nextWeek : plan))
            : [...current.weeklyPlans, nextWeek];

          return {
            ...current,
            weeklyPlans,
          };
        });
      },
      copyWeekForward: (sourceYear, sourceWeek, targetYear, targetWeek) => {
        setPlannerData((current) => {
          const source = getOrCreateWeekPlan(current, sourceYear, sourceWeek);
          const copied = copyWeekPlan(source, targetYear, targetWeek);
          const weeklyPlans = current.weeklyPlans.filter(
            (plan) => !(plan.isoYear === targetYear && plan.isoWeek === targetWeek),
          );

          return {
            ...current,
            weeklyPlans: [...weeklyPlans, copied],
          };
        });
      },
      addManualShoppingItem: (isoYear, isoWeek, draft) => {
        setPlannerData((current) => {
          const week = getOrCreateWeekPlan(current, isoYear, isoWeek);
          const nextWeek = {
            ...week,
            manualItems: [
              ...week.manualItems,
              {
                ...draft,
                id: createId("manual"),
                bought: false,
              },
            ],
          };
          const weeklyPlans = current.weeklyPlans.some((plan) => plan.id === week.id)
            ? current.weeklyPlans.map((plan) => (plan.id === week.id ? nextWeek : plan))
            : [...current.weeklyPlans, nextWeek];

          return {
            ...current,
            weeklyPlans,
          };
        });
      },
      markShoppingItemBought: (isoYear, isoWeek, itemId) => {
        setPlannerData((current) => {
          const week = getOrCreateWeekPlan(current, isoYear, isoWeek);
          const shopping = buildShoppingList(current, isoYear, isoWeek);
          const item = shopping.find((candidate) => candidate.id === itemId);
          if (!item || item.bought) return current;

          let pantryItems = current.pantryItems;
          let inventoryTransactions = current.inventoryTransactions;

          if (item.toBuy > 0) {
            pantryItems = addToPantry(
              pantryItems,
              item.name,
              item.toBuy,
              item.unit,
              item.categoryId,
            );
            inventoryTransactions = [
              createTransaction(
                "purchase",
                item.name,
                item.toBuy,
                item.unit,
                item.categoryId,
                item.source === "manual"
                  ? "Manual shopping item purchased."
                  : "Bought from weekly list.",
              ),
              ...inventoryTransactions,
            ];
          }

          const nextWeek =
            item.source === "manual"
              ? {
                  ...week,
                  manualItems: week.manualItems.map((manual) =>
                    `manual::${manual.id}` === item.id ? { ...manual, bought: true } : manual,
                  ),
                }
              : {
                  ...week,
                  purchasedAutoItemKeys: [...week.purchasedAutoItemKeys, item.id],
                };
          const weeklyPlans = current.weeklyPlans.some((plan) => plan.id === week.id)
            ? current.weeklyPlans.map((plan) => (plan.id === week.id ? nextWeek : plan))
            : [...current.weeklyPlans, nextWeek];

          return {
            ...current,
            weeklyPlans,
            pantryItems,
            inventoryTransactions,
          };
        });
      },
      addPantryAdjustment: (itemName, quantity, unit, categoryId, note) => {
        setPlannerData((current) => ({
          ...current,
          pantryItems: addToPantry(current.pantryItems, itemName, quantity, unit, categoryId),
          inventoryTransactions: [
            createTransaction(
              "manual_adjustment",
              itemName,
              quantity,
              unit,
              categoryId,
              note || "Manual pantry adjustment.",
            ),
            ...current.inventoryTransactions,
          ],
        }));
      },
      updatePantryItem: (itemId, quantity) => {
        setPlannerData((current) => {
          const pantryItem = current.pantryItems.find((item) => item.id === itemId);
          if (!pantryItem) return current;

          const delta = quantity - pantryItem.quantity;

          return {
            ...current,
            pantryItems: current.pantryItems
              .map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      quantity: Math.max(quantity, 0),
                      updatedAt: new Date().toISOString(),
                    }
                  : item,
              )
              .filter((item) => item.quantity > 0),
            inventoryTransactions: delta
              ? [
                  createTransaction(
                    "manual_adjustment",
                    pantryItem.name,
                    Math.abs(delta),
                    pantryItem.unit,
                    pantryItem.categoryId,
                    "Adjusted pantry quantity.",
                  ),
                  ...current.inventoryTransactions,
                ]
              : current.inventoryTransactions,
          };
        });
      },
      markMealCooked: (isoYear, isoWeek, entryId) => {
        setPlannerData((current) => {
          const week = getOrCreateWeekPlan(current, isoYear, isoWeek);
          const entry = week.entries.find((candidate) => candidate.id === entryId);
          if (!entry || !entry.recipeId || entry.cooked) return current;

          const recipe = current.recipes.find((candidate) => candidate.id === entry.recipeId);
          if (!recipe) return current;

          const scale = entry.servings / Math.max(recipe.baseServings, 1);
          let pantryItems = current.pantryItems;
          const transactions = [...current.inventoryTransactions];

          recipe.ingredients.forEach((ingredient) => {
            const quantity = ingredient.quantity * scale;
            pantryItems = subtractFromPantry(
              pantryItems,
              ingredient.name,
              quantity,
              ingredient.unit,
              ingredient.categoryId,
            );
            transactions.unshift(
              createTransaction(
                "cook_consumption",
                ingredient.name,
                quantity,
                ingredient.unit,
                ingredient.categoryId,
                `Used for ${recipe.title}.`,
              ),
            );
          });

          const nextWeek = {
            ...week,
            entries: week.entries.map((candidate) =>
              candidate.id === entry.id ? { ...candidate, cooked: true } : candidate,
            ),
          };
          const weeklyPlans = current.weeklyPlans.some((plan) => plan.id === week.id)
            ? current.weeklyPlans.map((plan) => (plan.id === week.id ? nextWeek : plan))
            : [...current.weeklyPlans, nextWeek];

          return {
            ...current,
            weeklyPlans,
            pantryItems,
            inventoryTransactions: transactions,
          };
        });
      },
      addLeftover: (itemName, quantity, unit, categoryId, note) => {
        setPlannerData((current) => ({
          ...current,
          pantryItems: addToPantry(current.pantryItems, itemName, quantity, unit, categoryId),
          inventoryTransactions: [
            createTransaction(
              "leftover_add",
              itemName,
              quantity,
              unit,
              categoryId,
              note || "Added leftovers back to pantry.",
            ),
            ...current.inventoryTransactions,
          ],
        }));
      },
      removePantryItem: (itemId) => {
        setPlannerData((current) => ({
          ...current,
          pantryItems: current.pantryItems.filter((item) => item.id !== itemId),
        }));
      },
      duplicateRecipe: (recipeId) => {
        setPlannerData((current) => {
          const original = current.recipes.find((recipe) => recipe.id === recipeId);
          if (!original) return current;

          const duplicate: Recipe = {
            ...original,
            id: createId("recipe"),
            title: `${original.title} (copy)`,
            archived: false,
            ingredients: original.ingredients.map((ingredient) => ({
              ...ingredient,
              id: createId("ingredient"),
            })),
          };

          return {
            ...current,
            recipes: [duplicate, ...current.recipes],
          };
        });
      },
      removeManualShoppingItem: (isoYear, isoWeek, itemId) => {
        setPlannerData((current) => {
          const week = getOrCreateWeekPlan(current, isoYear, isoWeek);
          const nextWeek = {
            ...week,
            manualItems: week.manualItems.filter((item) => item.id !== itemId),
          };
          const weeklyPlans = current.weeklyPlans.some((plan) => plan.id === week.id)
            ? current.weeklyPlans.map((plan) => (plan.id === week.id ? nextWeek : plan))
            : [...current.weeklyPlans, nextWeek];

          return { ...current, weeklyPlans };
        });
      },
    };
  }, [data, ready, todayInfo.isoWeek, todayInfo.isoYear]);

  if (!ready) {
    return null;
  }

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error("usePlanner must be used within PlannerProvider");
  }
  return context;
}
