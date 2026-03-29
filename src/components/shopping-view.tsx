"use client";

import { useMemo, useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { UNIT_OPTIONS } from "@/lib/constants";
import { formatRange, getDateForIsoWeek, getIsoWeekInfo, getWeekOptions } from "@/lib/date";
import { formatQuantity, groupByCategory, roundToStandardSize } from "@/lib/planner";

export function ShoppingView() {
  const {
    categories,
    currentIsoWeek,
    currentIsoYear,
    getShoppingList,
    markShoppingItemBought,
    addManualShoppingItem,
    removeManualShoppingItem,
  } = usePlanner();
  const { toast } = useToast();
  const [selection, setSelection] = useState({
    isoWeek: currentIsoWeek,
    isoYear: currentIsoYear,
  });
  const [draft, setDraft] = useState({
    name: "",
    quantity: 1,
    unit: "pcs",
    categoryId: categories[0]?.id ?? "pantry",
    note: "",
  });
  const [hideBought, setHideBought] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRemoveName, setConfirmRemoveName] = useState("");

  const navigate = (direction: 1 | -1) => {
    setSelection((current) => {
      const date = getDateForIsoWeek(current.isoYear, current.isoWeek, 0);
      date.setDate(date.getDate() + direction * 7);
      return getIsoWeekInfo(date);
    });
  };

  const shoppingItems = getShoppingList(selection.isoYear, selection.isoWeek);
  const visibleItems = hideBought ? shoppingItems.filter((item) => !item.bought) : shoppingItems;
  const groupedItems = useMemo(() => groupByCategory(visibleItems), [visibleItems]);
  const weekOptions = getWeekOptions(new Date(), 16);

  const totalToBuy = shoppingItems.filter((item) => item.toBuy > 0).length;
  const boughtCount = shoppingItems.filter((item) => item.bought).length;

  return (
    <>
      <ConfirmDialog
        open={confirmRemoveId !== null}
        title={`Remove "${confirmRemoveName}"?`}
        description="This will remove the manual item from your shopping list."
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmRemoveId) {
            const manualId = confirmRemoveId.replace("manual::", "");
            removeManualShoppingItem(selection.isoYear, selection.isoWeek, manualId);
            toast("Item removed", "info");
          }
          setConfirmRemoveId(null);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-[30px] bg-surface-strong p-5 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
        <div className="space-y-2">
          <p className="pill inline-flex w-fit text-xs uppercase tracking-[0.24em] text-muted">
            Shopping List
          </p>
          <h2 className="section-title text-3xl">Buy only what the week actually needs</h2>
          <p className="section-subtitle text-sm">
            Grocery totals scale from recipe servings and compare against current pantry stock.
          </p>
        </div>

        <div className="mt-5 space-y-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Previous week"
              className="rounded-2xl px-3 py-3 font-semibold button-secondary leading-none"
              onClick={() => navigate(-1)}
            >
              ←
            </button>
            <select
              aria-label="Selected shopping week"
              value={`${selection.isoYear}-${selection.isoWeek}`}
              onChange={(event) => {
                const [year, week] = event.target.value.split("-").map(Number);
                setSelection({ isoYear: year, isoWeek: week });
              }}
            >
              {weekOptions.map((option) => (
                <option
                  key={`${option.isoYear}-${option.isoWeek}`}
                  value={`${option.isoYear}-${option.isoWeek}`}
                >
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label="Next week"
              className="rounded-2xl px-3 py-3 font-semibold button-secondary leading-none"
              onClick={() => navigate(1)}
            >
              →
            </button>
          </div>

          <div className="rounded-[24px] bg-accent-soft p-4">
            <div className="text-sm font-semibold text-muted">
              Week {selection.isoWeek}, {selection.isoYear}
            </div>
            <div className="mt-1 text-2xl font-bold">
              {formatRange(selection.isoYear, selection.isoWeek)}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm section-subtitle">
                {boughtCount} of {totalToBuy} items bought
              </span>
              {totalToBuy > 0 ? (
                <div
                  className="h-2 w-24 rounded-full bg-white/50 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={boughtCount}
                  aria-valuemin={0}
                  aria-valuemax={totalToBuy}
                  aria-label={`${boughtCount} of ${totalToBuy} items bought`}
                >
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.round((boughtCount / totalToBuy) * 100)}%` }}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-line bg-white/65 p-4">
            <h3 className="text-lg font-semibold">Add a manual grocery</h3>
            <div className="grid gap-3">
              <input
                value={draft.name}
                placeholder="Item name"
                aria-label="Item name"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, name: event.target.value }))
                }
              />
              <div className="grid gap-3 sm:grid-cols-4">
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={draft.quantity}
                  aria-label="Quantity"
                  inputMode="decimal"
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      quantity: Number(event.target.value),
                    }))
                  }
                />
                <select
                  value={draft.unit}
                  aria-label="Unit"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, unit: event.target.value }))
                  }
                >
                  {UNIT_OPTIONS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
                <select
                  value={draft.categoryId}
                  aria-label="Category"
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, categoryId: event.target.value }))
                  }
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="rounded-2xl px-4 py-3 font-semibold button-primary"
                  onClick={() => {
                    if (!draft.name.trim()) return;
                    addManualShoppingItem(selection.isoYear, selection.isoWeek, {
                      ...draft,
                      name: draft.name.trim(),
                    });
                    toast("Item added to shopping list");
                    setDraft((current) => ({ ...current, name: "", note: "" }));
                  }}
                >
                  Add
                </button>
              </div>
              <input
                value={draft.note}
                placeholder="Optional note"
                aria-label="Item note"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, note: event.target.value }))
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-surface-strong p-5 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
        <div className="flex items-start justify-between gap-4 border-b border-line pb-4">
          <div className="space-y-2">
            <h2 className="section-title text-3xl">Grouped groceries</h2>
            <p className="section-subtitle text-sm">
              Manual items sit alongside recipe-derived ingredients in one buying flow.
            </p>
          </div>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-2xl border border-line bg-white/60 px-3 py-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={hideBought}
              onChange={(event) => setHideBought(event.target.checked)}
            />
            Hide bought
          </label>
        </div>

        <div className="mt-5 space-y-5">
          {Object.keys(groupedItems).length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-line p-5 text-sm section-subtitle">
              {hideBought && boughtCount > 0
                ? `All ${boughtCount} item${boughtCount !== 1 ? "s" : ""} bought — great work!`
                : "Your shopping list is empty. Add recipes to the week or drop in a manual grocery item."}
            </div>
          ) : (
            categories.map((category) => {
              const items = groupedItems[category.id];
              if (!items?.length) return null;

              return (
                <div key={category.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{category.name}</h3>
                    <span className="pill text-xs">{items.length} items</span>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`grid gap-3 rounded-[24px] border p-4 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_auto] ${
                          item.bought
                            ? "border-line bg-white/40 opacity-60"
                            : "border-line bg-white/70"
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-sm section-subtitle">
                            {item.source === "manual" ? "Manual" : item.note}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-muted">
                            Needed
                          </div>
                          <div className="font-semibold">{formatQuantity(roundToStandardSize(item.needed, item.unit), item.unit)}</div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-muted">
                            In pantry
                          </div>
                          <div className="font-semibold">
                            {formatQuantity(item.pantryQuantity, item.unit)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs uppercase tracking-[0.2em] text-muted">
                            To buy
                          </div>
                          <div className="font-semibold">{formatQuantity(roundToStandardSize(item.toBuy, item.unit), item.unit)}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            className={`rounded-2xl px-4 py-3 text-sm font-semibold ${item.bought ? "button-primary" : "button-secondary"}`}
                            onClick={() =>
                              markShoppingItemBought(selection.isoYear, selection.isoWeek, item.id)
                            }
                          >
                            {item.bought ? "✓ Bought" : "Mark bought"}
                          </button>
                          {item.source === "manual" ? (
                            <button
                              type="button"
                              className="rounded-2xl px-4 py-2 text-xs font-semibold button-ghost"
                              onClick={() => {
                                setConfirmRemoveName(item.name);
                                setConfirmRemoveId(item.id);
                              }}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
      </div>
    </>
  );
}
