"use client";

import { useMemo, useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { UNIT_OPTIONS } from "@/lib/constants";
import { formatQuantity, groupByCategory } from "@/lib/planner";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

export function PantryView() {
  const { data, categories, addPantryAdjustment, updatePantryItem, removePantryItem } = usePlanner();
  const { toast } = useToast();
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRemoveName, setConfirmRemoveName] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    quantity: 1,
    unit: "pcs",
    categoryId: categories[0]?.id ?? "pantry",
    note: "",
  });

  const groupedPantry = useMemo(() => groupByCategory(data.pantryItems), [data.pantryItems]);

  return (
    <>
      <ConfirmDialog
        open={confirmRemoveId !== null}
        title={`Remove "${confirmRemoveName}" from pantry?`}
        description="This will permanently remove the item and its stock from your pantry."
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmRemoveId) removePantryItem(confirmRemoveId);
          toast("Item removed", "info");
          setConfirmRemoveId(null);
        }}
        onCancel={() => setConfirmRemoveId(null)}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-[30px] bg-surface-strong p-5 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
        <div className="space-y-2">
          <p className="pill inline-flex w-fit text-xs uppercase tracking-[0.24em] text-muted">
            Pantry
          </p>
          <h2 className="section-title text-3xl">Keep inventory honest without extra work</h2>
          <p className="section-subtitle text-sm">
            Pantry changes happen when you buy, cook, or adjust something on purpose.
          </p>
        </div>

        <div className="mt-5 space-y-3 rounded-[24px] border border-line bg-white/65 p-4">
          <h3 className="text-lg font-semibold">Add or top up pantry stock</h3>
          <input
            value={draft.name}
            placeholder="Ingredient or item name"
            aria-label="Item name"
            onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
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
              onChange={(event) => setDraft((current) => ({ ...current, unit: event.target.value }))}
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
                addPantryAdjustment(
                  draft.name.trim(),
                  draft.quantity,
                  draft.unit,
                  draft.categoryId,
                  draft.note,
                );
                toast("Stock saved");
                setDraft((current) => ({ ...current, name: "", note: "" }));
              }}
            >
              Save
            </button>
          </div>
          <input
            value={draft.note}
            placeholder="Why are you adjusting this?"
            aria-label="Adjustment reason"
            onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
          />
        </div>

        <div className="mt-5 space-y-5">
          {Object.keys(groupedPantry).length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-line p-5 text-sm section-subtitle">
              Pantry is empty. It will fill up when you add stock manually or mark shopping items
              as bought.
            </div>
          ) : (
            categories.map((category) => {
              const items = groupedPantry[category.id];
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
                        className="grid gap-3 rounded-[24px] border border-line bg-white/70 p-4 md:grid-cols-[1fr_auto_auto]"
                      >
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-sm section-subtitle">
                            Last updated {new Date(item.updatedAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            step={0.25}
                            value={item.quantity}
                            onChange={(event) =>
                              updatePantryItem(item.id, Number(event.target.value))
                            }
                            aria-label={`${item.name} quantity`}
                            inputMode="decimal"
                            className="w-24"
                          />
                          <span className="shrink-0 text-sm text-muted">{item.unit}</span>
                        </div>
                        <button
                          type="button"
                          className="rounded-2xl px-3 py-2 text-sm font-semibold button-ghost"
                          onClick={() => {
                            setConfirmRemoveName(item.name);
                            setConfirmRemoveId(item.id);
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section className="rounded-[30px] bg-surface-strong p-5 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
        <div className="space-y-2 border-b border-line pb-4">
          <h2 className="section-title text-3xl">Recent inventory history</h2>
          <p className="section-subtitle text-sm">
            A lightweight event trail now makes future analytics easy later.
          </p>
        </div>

        <div className="mt-5 space-y-3">
          {data.inventoryTransactions.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-line p-5 text-sm section-subtitle">
              No pantry activity yet. Purchases, cooked meals, leftovers, and manual updates all
              appear here.
            </div>
          ) : (
            data.inventoryTransactions.slice(0, 20).map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-[24px] border border-line bg-white/70 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold">{transaction.itemName}</div>
                    <div className="text-sm section-subtitle">{transaction.note}</div>
                  </div>
                  <div className="text-sm font-semibold">
                    {formatQuantity(transaction.quantity, transaction.unit)}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="pill">{transaction.type.replaceAll("_", " ")}</span>
                  <span className="pill">
                    {new Date(transaction.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      </div>
    </>
  );
}
