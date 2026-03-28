"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { DIFFICULTIES, MEAL_SLOTS, UNIT_OPTIONS } from "@/lib/constants";
import { createId } from "@/lib/planner";
import { Recipe, RecipeDraft } from "@/lib/types";

function emptyDraft(): RecipeDraft {
  return {
    title: "",
    mealType: "Dinner",
    baseServings: 2,
    prepTimeMinutes: 15,
    cookTimeMinutes: 20,
    caloriesPerServing: 450,
    difficulty: "Easy",
    vegetarian: false,
    highProtein: false,
    budgetFriendly: true,
    tags: [],
    comments: "",
    instructions: "",
    ingredients: [
      {
        id: createId("ingredient"),
        name: "",
        quantity: 1,
        unit: "pcs",
        categoryId: "produce",
        note: "",
      },
    ],
  };
}

function draftFromRecipe(recipe: Recipe): RecipeDraft {
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({ ...ingredient })),
  };
}

export function RecipesView() {
  const { data, categories, createOrUpdateRecipe, archiveRecipe, duplicateRecipe } = usePlanner();
  const { toast } = useToast();
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mealFilter, setMealFilter] = useState<"All" | (typeof MEAL_SLOTS)[number]>("All");
  const [draft, setDraft] = useState<RecipeDraft>(emptyDraft());
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);

  const deferredSearch = useDeferredValue(search);

  const recipes = useMemo(() => {
    const lowerQuery = deferredSearch.trim().toLocaleLowerCase();
    return data.recipes
      .filter((recipe) => !recipe.archived)
      .filter((recipe) => (mealFilter === "All" ? true : recipe.mealType === mealFilter))
      .filter((recipe) =>
        lowerQuery
          ? [recipe.title, recipe.tags.join(" "), recipe.comments]
              .join(" ")
              .toLocaleLowerCase()
              .includes(lowerQuery)
          : true,
      )
      .toSorted((left, right) => left.title.localeCompare(right.title));
  }, [data.recipes, deferredSearch, mealFilter]);

  const saveRecipe = () => {
    if (!draft.title.trim()) return;

    createOrUpdateRecipe({
      ...draft,
      title: draft.title.trim(),
      tags: draft.tags.filter(Boolean),
      ingredients: draft.ingredients.filter((ingredient) => ingredient.name.trim()),
    });
    toast(selectedRecipeId ? "Recipe updated" : "Recipe created");
    setSelectedRecipeId(null);
    setDraft(emptyDraft());
  };

  const loadRecipe = (recipe: Recipe) => {
    startTransition(() => {
      setSelectedRecipeId(recipe.id);
      setDraft(draftFromRecipe(recipe));
    });
  };

  const handleArchiveConfirmed = () => {
    if (!confirmArchiveId) return;
    archiveRecipe(confirmArchiveId);
    toast("Recipe archived", "info");
    setConfirmArchiveId(null);
    setSelectedRecipeId(null);
    setDraft(emptyDraft());
  };

  return (
    <>
      <ConfirmDialog
        open={confirmArchiveId !== null}
        title="Archive recipe?"
        description="This recipe will be hidden from the planner and recipe list."
        confirmLabel="Archive"
        onConfirm={handleArchiveConfirmed}
        onCancel={() => setConfirmArchiveId(null)}
      />
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[30px] bg-surface-strong p-5 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
        <div className="space-y-2">
          <p className="pill inline-flex w-fit text-xs uppercase tracking-[0.24em] text-muted">
            Recipe Database
          </p>
          <h2 className="section-title text-3xl">Build your family favorites</h2>
          <p className="section-subtitle text-sm">
            Keep recipe setup lightweight, but detailed enough for smart planning later.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px]">
          <input
            value={search}
            placeholder="Search recipes, tags, comments"
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search recipes"
          />
          <select
            value={mealFilter}
            onChange={(event) => setMealFilter(event.target.value as typeof mealFilter)}
            aria-label="Filter by meal type"
          >
            <option value="All">All meal types</option>
            {MEAL_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-5 space-y-3">
          {recipes.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-line p-5 text-sm section-subtitle">
              No recipes yet. Start with one breakfast, one lunch, and one dinner so the weekly
              planner becomes useful immediately.
            </div>
          ) : (
            recipes.map((recipe) => (
              <div
                key={recipe.id}
                className="flex w-full flex-col gap-3 rounded-[24px] border border-line bg-white/70 p-4 transition hover:-translate-y-0.5 hover:bg-white"
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => loadRecipe(recipe)}
                >
                  <div>
                    <h3 className="text-lg font-semibold">{recipe.title}</h3>
                    <p className="text-sm section-subtitle">
                      {recipe.mealType} · {recipe.baseServings} servings ·{" "}
                      {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min ·{" "}
                      {recipe.caloriesPerServing} kcal ·{" "}
                      {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="pill text-xs shrink-0">{recipe.difficulty}</span>
                </button>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {recipe.vegetarian ? <span className="pill">Vegetarian</span> : null}
                  {recipe.highProtein ? <span className="pill">High protein</span> : null}
                  {recipe.budgetFriendly ? <span className="pill">Budget</span> : null}
                  {recipe.tags.map((tag) => (
                    <span key={tag} className="pill">
                      #{tag}
                    </span>
                  ))}
                  <button
                    type="button"
                    className="ml-auto rounded-full px-3 py-1 text-xs font-semibold button-secondary"
                    onClick={() => duplicateRecipe(recipe.id)}
                  >
                    Duplicate
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[30px] bg-surface-strong p-5 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
        <div className="flex flex-col gap-3 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="section-title text-3xl">
              {selectedRecipeId ? "Edit recipe" : "New recipe"}
            </h2>
            <p className="section-subtitle text-sm">
              Titles and ingredients can be multilingual. The UI stays in English.
            </p>
          </div>
          <button
            type="button"
            className="rounded-2xl px-4 py-3 text-sm font-semibold button-secondary"
            onClick={() => {
              setSelectedRecipeId(null);
              setDraft(emptyDraft());
            }}
          >
            Start fresh
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={draft.title}
              placeholder="Recipe title"
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              aria-label="Recipe title"
            />
            <select
              value={draft.mealType}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  mealType: event.target.value as RecipeDraft["mealType"],
                }))
              }
              aria-label="Meal type"
            >
              {MEAL_SLOTS.map((slot) => (
                <option key={slot} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <input
              type="number"
              min={1}
              value={draft.baseServings}
              onChange={(event) =>
                setDraft((current) => ({ ...current, baseServings: Number(event.target.value) }))
              }
              placeholder="Base servings"
              aria-label="Base servings"
              inputMode="numeric"
            />
            <input
              type="number"
              min={0}
              value={draft.prepTimeMinutes}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  prepTimeMinutes: Number(event.target.value),
                }))
              }
              placeholder="Prep"
              aria-label="Prep time in minutes"
              inputMode="numeric"
            />
            <input
              type="number"
              min={0}
              value={draft.cookTimeMinutes}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  cookTimeMinutes: Number(event.target.value),
                }))
              }
              placeholder="Cook"
              aria-label="Cook time in minutes"
              inputMode="numeric"
            />
            <input
              type="number"
              min={0}
              value={draft.caloriesPerServing}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  caloriesPerServing: Number(event.target.value),
                }))
              }
              placeholder="Calories"
              aria-label="Calories per serving"
              inputMode="numeric"
            />
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
            <select
              value={draft.difficulty}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  difficulty: event.target.value as RecipeDraft["difficulty"],
                }))
              }
              aria-label="Difficulty"
            >
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {difficulty}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-3 rounded-2xl border border-line bg-white/60 px-4">
              <input
                className="h-4 w-4"
                type="checkbox"
                checked={draft.vegetarian}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, vegetarian: event.target.checked }))
                }
              />
              Vegetarian
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-line bg-white/60 px-4">
              <input
                className="h-4 w-4"
                type="checkbox"
                checked={draft.highProtein}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, highProtein: event.target.checked }))
                }
              />
              High protein
            </label>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-line bg-white/60 px-4 py-3">
            <input
              className="h-4 w-4"
              type="checkbox"
              checked={draft.budgetFriendly}
              onChange={(event) =>
                setDraft((current) => ({ ...current, budgetFriendly: event.target.checked }))
              }
            />
            Budget friendly
          </label>

          <input
            value={draft.tags.join(", ")}
            placeholder="Tags, comma separated"
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                tags: event.target.value
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean),
              }))
            }
            aria-label="Recipe tags, comma separated"
          />

          <textarea
            value={draft.comments}
            placeholder="Comments for your family: what pairs well, what the kids loved, what to prep ahead."
            onChange={(event) =>
              setDraft((current) => ({ ...current, comments: event.target.value }))
            }
            aria-label="Family comments"
          />

          <textarea
            value={draft.instructions}
            placeholder="Quick instructions"
            onChange={(event) =>
              setDraft((current) => ({ ...current, instructions: event.target.value }))
            }
            aria-label="Instructions"
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Ingredients</h3>
                <p className="text-sm section-subtitle">
                  Categories drive grouping in shopping and pantry.
                </p>
              </div>
              <button
                type="button"
                className="rounded-2xl px-4 py-2 text-sm font-semibold button-secondary"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    ingredients: [
                      ...current.ingredients,
                      {
                        id: createId("ingredient"),
                        name: "",
                        quantity: 1,
                        unit: "pcs",
                        categoryId: categories[0]?.id ?? "pantry",
                        note: "",
                      },
                    ],
                  }))
                }
              >
                Add ingredient
              </button>
            </div>

            {draft.ingredients.map((ingredient, index) => (
              <div
                key={ingredient.id}
                className="grid gap-3 rounded-[24px] border border-line bg-white/70 p-4"
              >
                <div className="grid gap-3 md:grid-cols-[1.4fr_0.7fr_0.7fr_0.9fr_auto]">
                  <input
                    value={ingredient.name}
                    placeholder="Ingredient"
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        ingredients: current.ingredients.map((candidate) =>
                          candidate.id === ingredient.id
                            ? { ...candidate, name: event.target.value }
                            : candidate,
                        ),
                      }))
                    }
                    aria-label={`Ingredient ${index + 1} name`}
                  />
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={ingredient.quantity}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        ingredients: current.ingredients.map((candidate) =>
                          candidate.id === ingredient.id
                            ? { ...candidate, quantity: Number(event.target.value) }
                            : candidate,
                        ),
                      }))
                    }
                    aria-label={`Ingredient ${index + 1} quantity`}
                    inputMode="decimal"
                  />
                  <select
                    value={ingredient.unit}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        ingredients: current.ingredients.map((candidate) =>
                          candidate.id === ingredient.id
                            ? { ...candidate, unit: event.target.value }
                            : candidate,
                        ),
                      }))
                    }
                    aria-label={`Ingredient ${index + 1} unit`}
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  <select
                    value={ingredient.categoryId}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        ingredients: current.ingredients.map((candidate) =>
                          candidate.id === ingredient.id
                            ? { ...candidate, categoryId: event.target.value }
                            : candidate,
                        ),
                      }))
                    }
                    aria-label={`Ingredient ${index + 1} category`}
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="rounded-2xl px-3 py-2 text-sm font-semibold button-ghost"
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        ingredients:
                          current.ingredients.length === 1
                            ? current.ingredients
                            : current.ingredients.filter((candidate) => candidate.id !== ingredient.id),
                      }))
                    }
                    aria-label={`Remove ingredient ${index + 1}`}
                  >
                    Remove
                  </button>
                </div>
                <input
                  value={ingredient.note}
                  placeholder="Optional note"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      ingredients: current.ingredients.map((candidate) =>
                        candidate.id === ingredient.id
                          ? { ...candidate, note: event.target.value }
                          : candidate,
                      ),
                    }))
                  }
                  aria-label={`Ingredient ${index + 1} note`}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-2xl px-5 py-3 font-semibold button-primary"
              onClick={saveRecipe}
            >
              {selectedRecipeId ? "Save recipe" : "Create recipe"}
            </button>
            {selectedRecipeId ? (
              <button
                type="button"
                className="rounded-2xl px-5 py-3 font-semibold button-secondary"
                onClick={() => setConfirmArchiveId(selectedRecipeId)}
              >
                Archive recipe
              </button>
            ) : null}
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
