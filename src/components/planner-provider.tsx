"use client";

import {
  createContext,
<<<<<<< HEAD
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
=======
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { CATEGORIES, MEAL_SLOTS } from "@/lib/constants";
import { getIsoWeekInfo } from "@/lib/date";
import { createId } from "@/lib/planner";
import type {
  Category,
  FullWeekPlan,
  InventoryTransaction,
  MealSlot,
  PantryItem,
  Recipe,
  RecipeDraft,
  ShoppingItem,
  WeekEntry,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Internal storage types
// ---------------------------------------------------------------------------

interface StoredWeekEntry extends WeekEntry {
  isoYear: number;
  isoWeek: number;
}

interface StoredManualItem {
  id: string;
  isoYear: number;
  isoWeek: number;
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  note: string;
}

interface StoredBoughtId {
  isoYear: number;
  isoWeek: number;
  itemId: string;
}

interface StorageData {
  recipes: Recipe[];
  pantryItems: PantryItem[];
  inventoryTransactions: InventoryTransaction[];
  weekEntries: StoredWeekEntry[];
  manualShoppingItems: StoredManualItem[];
  boughtItemIds: StoredBoughtId[];
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "nom-nom-meals-data";

const EMPTY_DATA: StorageData = {
  recipes: [],
  pantryItems: [],
  inventoryTransactions: [],
  weekEntries: [],
  manualShoppingItems: [],
  boughtItemIds: [],
};

function loadData(): StorageData {
  if (typeof window === "undefined") return EMPTY_DATA;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_DATA;
    return { ...EMPTY_DATA, ...JSON.parse(raw) };
  } catch {
    return EMPTY_DATA;
  }
}

function saveData(data: StorageData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable – fail silently
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

interface ManualItemDraft {
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  note: string;
}

interface WeekSummary {
  plannedMeals: number;
  itemsToBuy: number;
  cookedMeals: number;
  reusedRecipes: number;
}

interface PlannerContextValue {
  data: {
    recipes: Recipe[];
    pantryItems: PantryItem[];
    inventoryTransactions: InventoryTransaction[];
  };
  categories: Category[];
  currentIsoWeek: number;
  currentIsoYear: number;
  getWeekPlan: (isoYear: number, isoWeek: number) => FullWeekPlan;
  getWeekSummary: (isoYear: number, isoWeek: number) => WeekSummary;
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
  updateWeekEntry: (
    isoYear: number,
    isoWeek: number,
    entryId: string,
<<<<<<< HEAD
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
=======
    updates: Partial<Pick<WeekEntry, "recipeId" | "servings" | "cooked" | "notes">>,
  ) => void;
  markMealCooked: (isoYear: number, isoWeek: number, entryId: string) => void;
  addLeftover: (
    name: string,
    quantity: number,
    unit: string,
    categoryId: string,
    note: string,
  ) => void;
  copyWeekForward: (
    fromYear: number,
    fromWeek: number,
    toYear: number,
    toWeek: number,
  ) => void;
  createOrUpdateRecipe: (draft: RecipeDraft) => void;
  archiveRecipe: (id: string) => void;
  duplicateRecipe: (id: string) => void;
  getShoppingList: (isoYear: number, isoWeek: number) => ShoppingItem[];
  markShoppingItemBought: (isoYear: number, isoWeek: number, itemId: string) => void;
  addManualShoppingItem: (
    isoYear: number,
    isoWeek: number,
    item: ManualItemDraft,
  ) => void;
  removeManualShoppingItem: (
    isoYear: number,
    isoWeek: number,
    manualId: string,
  ) => void;
  addPantryAdjustment: (
    name: string,
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
    quantity: number,
    unit: string,
    categoryId: string,
    note: string,
  ) => void;
<<<<<<< HEAD
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
=======
  updatePantryItem: (id: string, quantity: number) => void;
  removePantryItem: (id: string) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used inside PlannerProvider");
  return ctx;
}

// ---------------------------------------------------------------------------
// Helper: upsert a pantry item
// ---------------------------------------------------------------------------

function upsertPantryItem(
  prev: StorageData,
  name: string,
  quantity: number,
  unit: string,
  categoryId: string,
  note: string,
  type: string,
): StorageData {
  const pantryItems = [...prev.pantryItems];
  const idx = pantryItems.findIndex(
    (p) => p.name.toLowerCase() === name.toLowerCase() && p.unit === unit,
  );

  if (idx >= 0) {
    pantryItems[idx] = {
      ...pantryItems[idx],
      quantity: pantryItems[idx].quantity + quantity,
      updatedAt: new Date().toISOString(),
    };
  } else {
    pantryItems.push({
      id: createId("pantry"),
      name,
      quantity,
      unit,
      categoryId,
      updatedAt: new Date().toISOString(),
    });
  }

  const transaction: InventoryTransaction = {
    id: createId("txn"),
    itemName: name,
    quantity,
    unit,
    type,
    note,
    createdAt: new Date().toISOString(),
  };

  return {
    ...prev,
    pantryItems,
    inventoryTransactions: [transaction, ...prev.inventoryTransactions],
  };
}

// ---------------------------------------------------------------------------
// Helper: build a deterministic entry id
// ---------------------------------------------------------------------------

function entryId(
  isoYear: number,
  isoWeek: number,
  slot: MealSlot,
  dayIndex: number,
): string {
  return `entry::${isoYear}::${isoWeek}::${slot}::${dayIndex}`;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StorageData>(EMPTY_DATA);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage after first client render
  useEffect(() => {
    setData(loadData());
    setIsLoaded(true);
  }, []);

  // Persist to localStorage whenever data changes (skip the initial empty state)
  useEffect(() => {
    if (isLoaded) {
      saveData(data);
    }
  }, [data, isLoaded]);

  const { isoYear: currentIsoYear, isoWeek: currentIsoWeek } = getIsoWeekInfo(
    new Date(),
  );

  // Expose a stable ref to `data` so callbacks don't need it as a dep
  const dataRef = useRef(data);
  dataRef.current = data;

  // -------------------------------------------------------------------------
  // Week plan
  // -------------------------------------------------------------------------

  const getWeekPlan = useCallback(
    (isoYear: number, isoWeek: number): FullWeekPlan => {
      const stored = dataRef.current.weekEntries.filter(
        (e) => e.isoYear === isoYear && e.isoWeek === isoWeek,
      );

      const entries: WeekEntry[] = [];
      for (const slot of MEAL_SLOTS) {
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
          const id = entryId(isoYear, isoWeek, slot, dayIndex);
          const found = stored.find((e) => e.id === id);
          entries.push(
            found ?? {
              id,
              slot,
              dayIndex,
              recipeId: null,
              servings: 2,
              cooked: false,
              notes: "",
            },
          );
        }
      }

      return { isoYear, isoWeek, entries };
    },
    [],
  );

  const getShoppingList = useCallback(
    (isoYear: number, isoWeek: number): ShoppingItem[] => {
      const d = dataRef.current;

      // Aggregate recipe ingredients
      const agg = new Map<
        string,
        {
          name: string;
          unit: string;
          categoryId: string;
          needed: number;
          recipeNames: string[];
        }
      >();

      const weekEntries = d.weekEntries.filter(
        (e) =>
          e.isoYear === isoYear && e.isoWeek === isoWeek && e.recipeId !== null,
      );

      for (const entry of weekEntries) {
        const recipe = d.recipes.find((r) => r.id === entry.recipeId);
        if (!recipe) continue;
        const ratio = entry.servings / recipe.baseServings;

        for (const ing of recipe.ingredients) {
          const key = `${ing.name.toLowerCase()}::${ing.unit}`;
          const existing = agg.get(key);
          if (existing) {
            existing.needed += ing.quantity * ratio;
            if (!existing.recipeNames.includes(recipe.title)) {
              existing.recipeNames.push(recipe.title);
            }
          } else {
            agg.set(key, {
              name: ing.name,
              unit: ing.unit,
              categoryId: ing.categoryId,
              needed: ing.quantity * ratio,
              recipeNames: [recipe.title],
            });
          }
        }
      }

      const boughtSet = new Set(
        d.boughtItemIds
          .filter((b) => b.isoYear === isoYear && b.isoWeek === isoWeek)
          .map((b) => b.itemId),
      );

      const items: ShoppingItem[] = [];

      for (const [key, a] of agg) {
        const pantryItem = d.pantryItems.find(
          (p) =>
            p.name.toLowerCase() === a.name.toLowerCase() && p.unit === a.unit,
        );
        const pantryQuantity = pantryItem?.quantity ?? 0;
        const toBuy = Math.max(0, a.needed - pantryQuantity);
        const id = `ingredient::${key}`;

        items.push({
          id,
          name: a.name,
          unit: a.unit,
          categoryId: a.categoryId,
          needed: a.needed,
          pantryQuantity,
          toBuy,
          bought: boughtSet.has(id),
          note: a.recipeNames.join(", "),
          source: "recipe",
        });
      }

      // Manual items
      const manuals = d.manualShoppingItems.filter(
        (m) => m.isoYear === isoYear && m.isoWeek === isoWeek,
      );

      for (const m of manuals) {
        const id = `manual::${m.id}`;
        items.push({
          id,
          name: m.name,
          unit: m.unit,
          categoryId: m.categoryId,
          needed: m.quantity,
          pantryQuantity: 0,
          toBuy: m.quantity,
          bought: boughtSet.has(id),
          note: m.note,
          source: "manual",
        });
      }

      return items;
    },
    [],
  );

  const getWeekSummary = useCallback(
    (isoYear: number, isoWeek: number): WeekSummary => {
      const weekPlan = getWeekPlan(isoYear, isoWeek);
      const shoppingList = getShoppingList(isoYear, isoWeek);

      const plannedMeals = weekPlan.entries.filter(
        (e) => e.recipeId !== null,
      ).length;
      const cookedMeals = weekPlan.entries.filter((e) => e.cooked).length;
      const reusedRecipes = new Set(
        weekPlan.entries.filter((e) => e.recipeId).map((e) => e.recipeId),
      ).size;
      const itemsToBuy = shoppingList.filter((i) => i.toBuy > 0).length;

      return { plannedMeals, cookedMeals, reusedRecipes, itemsToBuy };
    },
    [getWeekPlan, getShoppingList],
  );

  // -------------------------------------------------------------------------
  // Week mutations
  // -------------------------------------------------------------------------

  const updateWeekEntry = useCallback(
    (
      isoYear: number,
      isoWeek: number,
      id: string,
      updates: Partial<Pick<WeekEntry, "recipeId" | "servings" | "cooked" | "notes">>,
    ) => {
      setData((prev) => {
        const weekEntries = [...prev.weekEntries];
        const idx = weekEntries.findIndex((e) => e.id === id);

        if (idx >= 0) {
          weekEntries[idx] = { ...weekEntries[idx], ...updates };
        } else {
          // Entry doesn't exist yet – parse slot/dayIndex from deterministic id
          const parts = id.split("::");
          const slot = parts[3] as MealSlot;
          const dayIndex = Number(parts[4]);
          weekEntries.push({
            id,
            isoYear,
            isoWeek,
            slot,
            dayIndex,
            recipeId: null,
            servings: 2,
            cooked: false,
            notes: "",
            ...updates,
          });
        }

        return { ...prev, weekEntries };
      });
    },
    [],
  );

  const markMealCooked = useCallback(
    (isoYear: number, isoWeek: number, id: string) => {
      setData((prev) => {
        const entry = prev.weekEntries.find((e) => e.id === id);
        const recipe = entry?.recipeId
          ? prev.recipes.find((r) => r.id === entry.recipeId)
          : null;

        // Mark entry as cooked
        let weekEntries: StoredWeekEntry[];
        if (entry) {
          weekEntries = prev.weekEntries.map((e) =>
            e.id === id ? { ...e, cooked: true } : e,
          );
        } else {
          const parts = id.split("::");
          const slot = parts[3] as MealSlot;
          const dayIndex = Number(parts[4]);
          weekEntries = [
            ...prev.weekEntries,
            {
              id,
              isoYear,
              isoWeek,
              slot,
              dayIndex,
              recipeId: null,
              servings: 2,
              cooked: true,
              notes: "",
            },
          ];
        }

        if (!recipe || !entry) return { ...prev, weekEntries };

        // Deduct ingredients from pantry
        const servingsRatio = entry.servings / recipe.baseServings;
        const pantryItems = [...prev.pantryItems];
        const transactions: InventoryTransaction[] = [];

        for (const ing of recipe.ingredients) {
          const usedQty = ing.quantity * servingsRatio;
          const idx = pantryItems.findIndex(
            (p) =>
              p.name.toLowerCase() === ing.name.toLowerCase() &&
              p.unit === ing.unit,
          );
          if (idx >= 0) {
            pantryItems[idx] = {
              ...pantryItems[idx],
              quantity: Math.max(0, pantryItems[idx].quantity - usedQty),
              updatedAt: new Date().toISOString(),
            };
          }
          transactions.push({
            id: createId("txn"),
            itemName: ing.name,
            quantity: usedQty,
            unit: ing.unit,
            type: "cooked_meal",
            note: `Used in ${recipe.title}`,
            createdAt: new Date().toISOString(),
          });
        }

        return {
          ...prev,
          weekEntries,
          pantryItems,
          inventoryTransactions: [
            ...transactions,
            ...prev.inventoryTransactions,
          ],
        };
      });
    },
    [],
  );

  const copyWeekForward = useCallback(
    (fromYear: number, fromWeek: number, toYear: number, toWeek: number) => {
      setData((prev) => {
        const fromEntries = prev.weekEntries.filter(
          (e) => e.isoYear === fromYear && e.isoWeek === fromWeek,
        );

        const copied: StoredWeekEntry[] = fromEntries.map((e) => ({
          ...e,
          id: entryId(toYear, toWeek, e.slot, e.dayIndex),
          isoYear: toYear,
          isoWeek: toWeek,
          cooked: false,
          notes: "",
        }));

        const weekEntries = [
          ...prev.weekEntries.filter(
            (e) => !(e.isoYear === toYear && e.isoWeek === toWeek),
          ),
          ...copied,
        ];

        return { ...prev, weekEntries };
      });
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Recipes
  // -------------------------------------------------------------------------

  const createOrUpdateRecipe = useCallback((draft: RecipeDraft) => {
    setData((prev) => {
      const recipes = [...prev.recipes];
      if (draft.id) {
        const idx = recipes.findIndex((r) => r.id === draft.id);
        if (idx >= 0) {
          const { id: _id, ...rest } = draft;
          recipes[idx] = { ...recipes[idx], ...rest };
        }
      } else {
        const { id: _id, ...rest } = draft;
        recipes.push({ ...rest, id: createId("recipe"), archived: false });
      }
      return { ...prev, recipes };
    });
  }, []);

  const archiveRecipe = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      recipes: prev.recipes.map((r) =>
        r.id === id ? { ...r, archived: true } : r,
      ),
    }));
  }, []);

  const duplicateRecipe = useCallback((id: string) => {
    setData((prev) => {
      const recipe = prev.recipes.find((r) => r.id === id);
      if (!recipe) return prev;
      const { id: _id, ...rest } = recipe;
      return {
        ...prev,
        recipes: [
          ...prev.recipes,
          {
            ...rest,
            id: createId("recipe"),
            title: `Copy of ${recipe.title}`,
            archived: false,
          },
        ],
      };
    });
  }, []);

  // -------------------------------------------------------------------------
  // Shopping
  // -------------------------------------------------------------------------

  const markShoppingItemBought = useCallback(
    (isoYear: number, isoWeek: number, itemId: string) => {
      setData((prev) => {
        const already = prev.boughtItemIds.some(
          (b) =>
            b.isoYear === isoYear &&
            b.isoWeek === isoWeek &&
            b.itemId === itemId,
        );
        if (already) return prev;
        return {
          ...prev,
          boughtItemIds: [
            ...prev.boughtItemIds,
            { isoYear, isoWeek, itemId },
          ],
        };
      });
    },
    [],
  );

  const addManualShoppingItem = useCallback(
    (isoYear: number, isoWeek: number, item: ManualItemDraft) => {
      setData((prev) => ({
        ...prev,
        manualShoppingItems: [
          ...prev.manualShoppingItems,
          { ...item, id: createId("manual"), isoYear, isoWeek },
        ],
      }));
    },
    [],
  );

  const removeManualShoppingItem = useCallback(
    (isoYear: number, isoWeek: number, manualId: string) => {
      setData((prev) => ({
        ...prev,
        manualShoppingItems: prev.manualShoppingItems.filter(
          (m) =>
            !(
              m.isoYear === isoYear &&
              m.isoWeek === isoWeek &&
              m.id === manualId
            ),
        ),
        boughtItemIds: prev.boughtItemIds.filter(
          (b) =>
            !(
              b.isoYear === isoYear &&
              b.isoWeek === isoWeek &&
              b.itemId === `manual::${manualId}`
            ),
        ),
      }));
    },
    [],
  );

  // -------------------------------------------------------------------------
  // Pantry
  // -------------------------------------------------------------------------

  const addLeftover = useCallback(
    (
      name: string,
      quantity: number,
      unit: string,
      categoryId: string,
      note: string,
    ) => {
      setData((prev) =>
        upsertPantryItem(prev, name, quantity, unit, categoryId, note, "leftover"),
      );
    },
    [],
  );

  const addPantryAdjustment = useCallback(
    (
      name: string,
      quantity: number,
      unit: string,
      categoryId: string,
      note: string,
    ) => {
      setData((prev) =>
        upsertPantryItem(
          prev,
          name,
          quantity,
          unit,
          categoryId,
          note,
          "manual_adjustment",
        ),
      );
    },
    [],
  );

  const updatePantryItem = useCallback((id: string, quantity: number) => {
    setData((prev) => ({
      ...prev,
      pantryItems: prev.pantryItems.map((p) =>
        p.id === id ? { ...p, quantity, updatedAt: new Date().toISOString() } : p,
      ),
    }));
  }, []);

  const removePantryItem = useCallback((id: string) => {
    setData((prev) => ({
      ...prev,
      pantryItems: prev.pantryItems.filter((p) => p.id !== id),
    }));
  }, []);

  // -------------------------------------------------------------------------
  // Context value
  // -------------------------------------------------------------------------

  const value: PlannerContextValue = {
    data: {
      recipes: data.recipes,
      pantryItems: data.pantryItems,
      inventoryTransactions: data.inventoryTransactions,
    },
    categories: CATEGORIES,
    currentIsoWeek,
    currentIsoYear,
    getWeekPlan,
    getWeekSummary,
    updateWeekEntry,
    markMealCooked,
    addLeftover,
    copyWeekForward,
    createOrUpdateRecipe,
    archiveRecipe,
    duplicateRecipe,
    getShoppingList,
    markShoppingItemBought,
    addManualShoppingItem,
    removeManualShoppingItem,
    addPantryAdjustment,
    updatePantryItem,
    removePantryItem,
  };

  return (
    <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>
  );
>>>>>>> 520c3923171ed8b3e5ebd04451e0d31eddb3de94
}
