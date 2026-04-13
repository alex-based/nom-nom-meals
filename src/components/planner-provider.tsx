"use client";

import {
  createContext,
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
  updateWeekEntry: (
    isoYear: number,
    isoWeek: number,
    entryId: string,
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
    quantity: number,
    unit: string,
    categoryId: string,
    note: string,
  ) => void;
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

  // Load personal data from localStorage; load shared recipes from the server.
  useEffect(() => {
    const localData = loadData();
    setData(localData);

    fetch("/api/recipes")
      .then((r) => r.json())
      .then((apiRecipes: Recipe[]) => {
        if (apiRecipes.length > 0) {
          // Use the server's shared recipe list as the source of truth.
          setData((prev) => ({ ...prev, recipes: apiRecipes }));
        } else if (localData.recipes.length > 0) {
          // First run: migrate any existing localStorage recipes to the shared store.
          for (const recipe of localData.recipes) {
            fetch("/api/recipes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(recipe),
            }).catch(console.error);
          }
        }
      })
      .catch(console.error)
      .finally(() => setIsLoaded(true));
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
    let recipeToSync: Recipe | null = null;

    if (draft.id) {
      const existing = dataRef.current.recipes.find((r) => r.id === draft.id);
      if (existing) {
        const { id: _id, ...rest } = draft;
        recipeToSync = { ...existing, ...rest };
      }
    } else {
      const { id: _id, ...rest } = draft;
      recipeToSync = { ...rest, id: createId("recipe"), archived: false };
    }

    if (!recipeToSync) return;
    const synced = recipeToSync;

    setData((prev) => {
      const recipes = [...prev.recipes];
      if (draft.id) {
        const idx = recipes.findIndex((r) => r.id === draft.id);
        if (idx >= 0) recipes[idx] = synced;
      } else {
        recipes.push(synced);
      }
      return { ...prev, recipes };
    });

    fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(synced),
    }).catch(console.error);
  }, []);

  const archiveRecipe = useCallback((id: string) => {
    const recipe = dataRef.current.recipes.find((r) => r.id === id);
    if (!recipe) return;
    const archived = { ...recipe, archived: true };

    setData((prev) => ({
      ...prev,
      recipes: prev.recipes.map((r) => (r.id === id ? archived : r)),
    }));

    fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(archived),
    }).catch(console.error);
  }, []);

  const duplicateRecipe = useCallback((id: string) => {
    const recipe = dataRef.current.recipes.find((r) => r.id === id);
    if (!recipe) return;
    const { id: _id, ...rest } = recipe;
    const duplicate: Recipe = {
      ...rest,
      id: createId("recipe"),
      title: `Copy of ${recipe.title}`,
      archived: false,
    };

    setData((prev) => ({
      ...prev,
      recipes: [...prev.recipes, duplicate],
    }));

    fetch("/api/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(duplicate),
    }).catch(console.error);
  }, []);

  // -------------------------------------------------------------------------
  // Shopping
  // -------------------------------------------------------------------------

  const markShoppingItemBought = useCallback(
    (isoYear: number, isoWeek: number, itemId: string) => {
      setData((prev) => {
        const alreadyIndex = prev.boughtItemIds.findIndex(
          (b) =>
            b.isoYear === isoYear &&
            b.isoWeek === isoWeek &&
            b.itemId === itemId,
        );
        if (alreadyIndex !== -1) {
          return {
            ...prev,
            boughtItemIds: prev.boughtItemIds.filter((_, i) => i !== alreadyIndex),
          };
        }
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
}
