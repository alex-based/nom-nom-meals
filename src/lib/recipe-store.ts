import type { Recipe } from "@/lib/types";

// Server-side in-memory recipe store, shared across all users.
// Data persists for the lifetime of the Node.js process.
// Intended to be replaced with a database (e.g. Supabase) for production durability.
const store = new Map<string, Recipe>();

export function getAllRecipes(): Recipe[] {
  return Array.from(store.values());
}

export function upsertRecipe(recipe: Recipe): void {
  store.set(recipe.id, recipe);
}
