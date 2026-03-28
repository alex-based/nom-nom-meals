# UI/UX Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 15 identified UI/UX issues across accessibility, form feedback, destructive-action safety, and visual polish in the Family Meal Planner Next.js app.

**Architecture:** Pure frontend changes — no backend or data model changes. New components: `Toast` (context-based notification system) and `ConfirmDialog` (inline modal). All other fixes are targeted edits to existing files. No test infrastructure exists in this project, so correctness is verified by `next build` (TypeScript + ESLint) after each task.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (CSS-only utility classes), TypeScript 5. No icon library — inline SVG used for the checkmark icon.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `src/app/globals.css` | Modify | Focus rings, button-ghost base, prefers-reduced-motion, html gradient, letter-spacing |
| `src/app/layout.tsx` | Modify | Viewport meta export, ToastProvider wrapper |
| `src/components/toast.tsx` | **Create** | Toast context, `useToast` hook, `ToastProvider`, `ToastContainer` UI |
| `src/components/confirm-dialog.tsx` | **Create** | `ConfirmDialog` modal component |
| `src/components/week-planner.tsx` | Modify | Sub-12px text, SVG check icon, `aria-label` on inputs, `inputMode`, `aria-live` on summary |
| `src/components/recipes-view.tsx` | Modify | `aria-label` on number inputs, `inputMode`, toast on save, confirm on archive |
| `src/components/pantry-view.tsx` | Modify | `aria-label` on inputs, toast on save, confirm on remove |
| `src/components/shopping-view.tsx` | Modify | `aria-label` on inputs, toast on add, confirm on remove |

---

### Task 1: Global CSS — Focus Rings, button-ghost, prefers-reduced-motion, html Gradient, Letter-spacing

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Add focus-visible rings for buttons and links, fix button-ghost base, add prefers-reduced-motion, fix html gradient, scope letter-spacing**

Replace the entire `src/app/globals.css` with the following (only the sections marked `CHANGED` are new; all other content is preserved):

```css
@import "tailwindcss";
@source not "../build-output/**";
@source not "../.next-app/**";

:root {
  --background: #f6efe5;
  --foreground: #1f1811;
  --surface: rgba(255, 250, 245, 0.84);
  --surface-strong: #fffaf5;
  --muted: #6f6256;
  --line: rgba(92, 68, 43, 0.12);
  --accent: #c96b3b;
  --accent-strong: #a24f27;
  --accent-soft: rgba(201, 107, 59, 0.14);
  --success: #357355;
  --font-sans: "Aptos", "Segoe UI", "Trebuchet MS", sans-serif;
  --font-display: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
}

/* Design-token utilities */
.bg-surface        { background: var(--surface); }
.bg-surface-strong { background: var(--surface-strong); }
.bg-accent-soft    { background: var(--accent-soft); }
.bg-accent         { background: var(--accent); }
.text-muted        { color: var(--muted); }
.text-accent       { color: var(--accent); }
.text-accent-strong{ color: var(--accent-strong); }
.text-success      { color: var(--success); }
.border-line       { border-color: var(--line); }
.border-accent     { border-color: var(--accent); }

* {
  box-sizing: border-box;
}

/* CHANGED: gradient moved here from html so it's visible under the glass panel */
html {
  background: #f6efe5;
}

body {
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.9), transparent 30%),
    linear-gradient(180deg, #efe3d1 0%, #f6efe5 22%, #fbf7f2 100%);
  color: var(--foreground);
  font-family: var(--font-sans), sans-serif;
  min-height: 100vh;
}

a {
  color: inherit;
  text-decoration: none;
}

button,
input,
select,
textarea {
  font: inherit;
}

input,
select,
textarea {
  width: 100%;
  border: 1px solid var(--line);
  background: rgba(255, 252, 248, 0.88);
  color: var(--foreground);
  border-radius: 16px;
  padding: 0.75rem 0.95rem;
  outline: none;
  transition:
    border-color 160ms ease,
    box-shadow 160ms ease,
    background-color 160ms ease;
  min-width: 0;
}

input:focus,
select:focus,
textarea:focus {
  border-color: rgba(201, 107, 59, 0.75);
  box-shadow: 0 0 0 4px rgba(201, 107, 59, 0.12);
}

textarea {
  min-height: 120px;
  resize: vertical;
}

/* CHANGED: keyboard focus ring for buttons and links */
button:focus-visible,
a:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 4px;
}

::selection {
  background: rgba(201, 107, 59, 0.25);
}

.glass-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  backdrop-filter: blur(18px);
  box-shadow: 0 18px 60px rgba(100, 70, 40, 0.08);
}

/* CHANGED: section-title letter-spacing scoped to large sizes only */
.section-title {
  font-family: var(--font-display), serif;
}

.section-title-large {
  letter-spacing: -0.04em;
}

.section-subtitle {
  color: var(--muted);
}

.pill {
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 0.32rem 0.7rem;
  background: rgba(255, 255, 255, 0.48);
}

.button-primary {
  background: var(--accent);
  color: white;
}

.button-primary:hover {
  background: var(--accent-strong);
}

.button-secondary {
  background: rgba(255, 255, 255, 0.66);
}

.button-secondary:hover {
  background: rgba(255, 255, 255, 0.92);
}

/* CHANGED: button-ghost now has explicit base styles */
.button-ghost {
  background: transparent;
  color: var(--foreground);
}

.button-ghost:hover {
  background: rgba(255, 255, 255, 0.92);
}

/* CHANGED: prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /home/alexkhlopenko/claudeprojects/family-meal-planner && npm run build 2>&1 | tail -20
```

Expected: no TypeScript or ESLint errors.

- [ ] **Step 3: Apply `section-title-large` to the two largest headings in app-shell.tsx**

In `src/components/app-shell.tsx` line 25, change:
```tsx
// Before
<h1 className="section-title text-4xl text-foreground sm:text-5xl">
// After
<h1 className="section-title section-title-large text-4xl text-foreground sm:text-5xl">
```

- [ ] **Step 4: Commit**

```bash
cd /home/alexkhlopenko/claudeprojects/family-meal-planner
git add src/app/globals.css src/components/app-shell.tsx
git commit -m "fix(css): focus rings, button-ghost base, reduced-motion, gradient, letter-spacing"
```

---

### Task 2: Viewport Meta in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Add explicit viewport export**

Next.js 14+ exposes a `viewport` named export separate from `metadata`. Replace `src/app/layout.tsx` with:

```tsx
import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { PlannerProvider } from "@/components/planner-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Meal Planner",
  description:
    "A warm, household-friendly meal planner for recipes, shopping, and pantry tracking.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <AppShell>
          <PlannerProvider>{children}</PlannerProvider>
        </AppShell>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /home/alexkhlopenko/claudeprojects/family-meal-planner && npm run build 2>&1 | tail -20
```

Expected: no errors. Next.js may warn that `viewport` moved out of `metadata` — that's expected and correct.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx
git commit -m "fix(layout): explicit viewport meta export"
```

---

### Task 3: Toast Notification Component

**Files:**
- Create: `src/components/toast.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Create `src/components/toast.tsx`**

```tsx
"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const toast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `toast-${++counterRef.current}`;
    setItems((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer items={items} />
    </ToastContext.Provider>
  );
}

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-[#357355] text-white",
  error: "bg-[#c0392b] text-white",
  info: "bg-[#1f1811] text-white",
};

function ToastContainer({ items }: { items: ToastItem[] }) {
  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-6 z-[1000] flex flex-col gap-2"
    >
      {items.map((item) => (
        <div
          key={item.id}
          role="status"
          className={`pointer-events-auto rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg ${variantStyles[item.variant]}`}
        >
          {item.message}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Wrap layout with ToastProvider**

Update `src/app/layout.tsx`:

```tsx
import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { PlannerProvider } from "@/components/planner-provider";
import { ToastProvider } from "@/components/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Meal Planner",
  description:
    "A warm, household-friendly meal planner for recipes, shopping, and pantry tracking.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ToastProvider>
          <AppShell>
            <PlannerProvider>{children}</PlannerProvider>
          </AppShell>
        </ToastProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
cd /home/alexkhlopenko/claudeprojects/family-meal-planner && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/toast.tsx src/app/layout.tsx
git commit -m "feat: toast notification system"
```

---

### Task 4: Confirm Dialog Component

**Files:**
- Create: `src/components/confirm-dialog.tsx`

- [ ] **Step 1: Create `src/components/confirm-dialog.tsx`**

```tsx
"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      className="fixed inset-0 z-[500] flex items-center justify-center p-4"
    >
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="relative w-full max-w-sm rounded-[28px] bg-surface-strong p-6 shadow-[0_24px_64px_rgba(0,0,0,0.18)]">
        <h2 id="confirm-title" className="text-lg font-semibold">
          {title}
        </h2>
        <p id="confirm-desc" className="mt-2 text-sm text-muted">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-2xl px-4 py-2 text-sm font-semibold button-secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded-2xl px-4 py-2 text-sm font-semibold bg-[#c0392b] text-white hover:bg-[#a93226]"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /home/alexkhlopenko/claudeprojects/family-meal-planner && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/confirm-dialog.tsx
git commit -m "feat: confirm dialog component"
```

---

### Task 5: Week Planner — Sub-12px Text, SVG Icon, aria-labels, inputMode, aria-live

**Files:**
- Modify: `src/components/week-planner.tsx`

All changes are within the single `week-planner.tsx` file. Apply them all in one pass:

1. **Summary section** — add `aria-live="polite"` to the stats grid so screen readers announce when week changes.
2. **"✓ done" badge** — replace `text-[10px]` with `text-xs`; replace `✓` with inline SVG.
3. **Recipe meta line** — replace `text-[11px]` with `text-xs`.
4. **"srv" label** — replace `text-[11px]` with `text-xs`.
5. **Servings input** — add `aria-label="Servings"` and `inputMode="decimal"`.
6. **"Mark cooked" / "Cooked ✓" button** — replace text `✓` with inline SVG.
7. **Leftover quantity input** — add `aria-label="Leftover quantity"` and `inputMode="decimal"`.
8. **Notes input** — add `aria-label="Meal notes"`.

- [ ] **Step 1: Apply all week-planner changes**

Replace `src/components/week-planner.tsx` with:

```tsx
"use client";

import { useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { MEAL_SLOTS } from "@/lib/constants";
import { formatRange, formatShortDate, getDateForIsoWeek, getIsoWeekInfo, getWeekOptions } from "@/lib/date";
import { entriesForSlot, recipeById } from "@/lib/planner";

function stepWeek(isoYear: number, isoWeek: number, direction: 1 | -1) {
  const date = getDateForIsoWeek(isoYear, isoWeek, 0);
  date.setDate(date.getDate() + direction * 7);
  return getIsoWeekInfo(date);
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className ?? "inline-block h-3 w-3"}
    >
      <path
        fillRule="evenodd"
        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function WeekPlanner() {
  const {
    data,
    currentIsoWeek,
    currentIsoYear,
    getWeekPlan,
    getWeekSummary,
    updateWeekEntry,
    markMealCooked,
    addLeftover,
    copyWeekForward,
  } = usePlanner();
  const [selection, setSelection] = useState({
    isoWeek: currentIsoWeek,
    isoYear: currentIsoYear,
  });
  const [copyTarget, setCopyTarget] = useState(() => {
    const next = stepWeek(currentIsoYear, currentIsoWeek, 1);
    return { isoWeek: next.isoWeek, isoYear: next.isoYear };
  });
  const [leftoverDrafts, setLeftoverDrafts] = useState<
    Record<string, { name: string; quantity: string; unit: string; categoryId: string }>
  >({});

  const weekPlan = getWeekPlan(selection.isoYear, selection.isoWeek);
  const summary = getWeekSummary(selection.isoYear, selection.isoWeek);
  const recipes = data.recipes.filter((recipe) => !recipe.archived);
  const recipeMap = recipeById(recipes);
  const weekOptions = getWeekOptions(new Date(), 16);
  const today = new Date();

  const slotOptions = Object.fromEntries(
    MEAL_SLOTS.map((slot) => [slot, recipes.filter((recipe) => recipe.mealType === slot)]),
  ) as Record<(typeof MEAL_SLOTS)[number], typeof recipes>;

  const navigate = (direction: 1 | -1) => {
    setSelection((current) => stepWeek(current.isoYear, current.isoWeek, direction));
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] bg-surface-strong p-5 shadow-[0_14px_40px_rgba(106,79,49,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="pill inline-flex w-fit text-xs uppercase tracking-[0.24em] text-muted">
                Weekly View
              </p>
              <h2 className="section-title text-3xl">Week {selection.isoWeek}</h2>
              <p className="section-subtitle text-sm">
                {formatRange(selection.isoYear, selection.isoWeek)} · three meal slots · flexible
                servings
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
                  aria-label="Select week"
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
              <button
                type="button"
                className="rounded-2xl px-4 py-3 font-semibold button-secondary whitespace-nowrap"
                onClick={() =>
                  setSelection({ isoWeek: currentIsoWeek, isoYear: currentIsoYear })
                }
              >
                Today
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] bg-surface-strong p-5 shadow-[0_14px_40px_rgba(106,79,49,0.08)]">
          <p className="pill inline-flex w-fit text-xs uppercase tracking-[0.24em] text-muted">
            This week
          </p>
          {/* aria-live so screen readers announce stat changes when week changes */}
          <div aria-live="polite" className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-accent-soft p-4">
              <div className="text-2xl font-bold">{summary.plannedMeals}</div>
              <div className="section-subtitle">planned meals</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-2xl font-bold">{summary.itemsToBuy}</div>
              <div className="section-subtitle">items to buy</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-2xl font-bold">{summary.cookedMeals}</div>
              <div className="section-subtitle">meals cooked</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-4">
              <div className="text-2xl font-bold">{summary.reusedRecipes}</div>
              <div className="section-subtitle">recipes in rotation</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] bg-surface-strong p-4 shadow-[0_18px_50px_rgba(106,79,49,0.07)]">
        <div className="mb-4 flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="section-title text-2xl">Plan meals by day</h3>
            <p className="section-subtitle text-sm">
              Reuse recipes freely and scale servings per meal.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <select
              aria-label="Copy to week"
              value={`${copyTarget.isoYear}-${copyTarget.isoWeek}`}
              onChange={(event) => {
                const [year, week] = event.target.value.split("-").map(Number);
                setCopyTarget({ isoYear: year, isoWeek: week });
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
              className="rounded-2xl px-4 py-3 font-semibold button-primary whitespace-nowrap"
              onClick={() =>
                copyWeekForward(
                  selection.isoYear,
                  selection.isoWeek,
                  copyTarget.isoYear,
                  copyTarget.isoWeek,
                )
              }
            >
              Copy to week
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="grid grid-cols-7 gap-3" style={{ minWidth: "1120px" }}>
          {Array.from({ length: 7 }, (_, dayIndex) => {
            const date = getDateForIsoWeek(selection.isoYear, selection.isoWeek, dayIndex);
            const isToday = date.toDateString() === today.toDateString();

            return (
              <article
                key={date.toISOString()}
                className={`rounded-[26px] border p-3 ${
                  isToday
                    ? "border-accent bg-accent-soft"
                    : "border-line bg-white/70"
                }`}
              >
                <div className="mb-3">
                  <p className={`text-xs font-semibold ${isToday ? "text-accent-strong" : "text-muted"}`}>
                    {formatShortDate(date)}
                  </p>
                  {isToday ? (
                    <span className="mt-1 inline-block text-xs font-semibold rounded-full bg-accent text-white px-2 py-0.5">Today</span>
                  ) : null}
                </div>

                <div className="space-y-3">
                  {MEAL_SLOTS.map((slot) => {
                    const entry = entriesForSlot(weekPlan, slot)[dayIndex];
                    const recipe = entry.recipeId ? recipeMap.get(entry.recipeId) : null;
                    const leftoverDraft = leftoverDrafts[entry.id] ?? {
                      name: recipe ? `${recipe.title} leftovers` : "",
                      quantity: "",
                      unit: "pcs",
                      categoryId: "pantry",
                    };

                    return (
                      <div key={slot} className="space-y-2 rounded-[18px] bg-surface p-2.5">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted">{slot}</p>
                          {entry.cooked ? (
                            <span className="flex items-center gap-0.5 text-xs font-semibold text-success">
                              <CheckIcon />
                              <span>done</span>
                            </span>
                          ) : null}
                        </div>

                        <select
                          aria-label={`${slot} recipe for ${formatShortDate(date)}`}
                          value={entry.recipeId ?? ""}
                          onChange={(event) =>
                            updateWeekEntry(selection.isoYear, selection.isoWeek, entry.id, {
                              recipeId: event.target.value || null,
                              cooked: false,
                            })
                          }
                        >
                          <option value="">— pick —</option>
                          {slotOptions[slot].map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.title}
                            </option>
                          ))}
                        </select>

                        {recipe ? (
                          <p className="text-xs text-muted leading-tight px-0.5">
                            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min · {recipe.caloriesPerServing} kcal
                          </p>
                        ) : null}

                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            inputMode="decimal"
                            min={1}
                            step={0.5}
                            value={entry.servings}
                            onChange={(event) =>
                              updateWeekEntry(selection.isoYear, selection.isoWeek, entry.id, {
                                servings: Number(event.target.value),
                              })
                            }
                            aria-label={`${slot} servings`}
                            className="w-14 text-center"
                          />
                          <span className="text-xs text-muted shrink-0">srv</span>
                        </div>

                        <button
                          type="button"
                          className="w-full rounded-xl px-2 py-1.5 text-xs font-semibold button-secondary disabled:opacity-40"
                          disabled={!entry.recipeId || entry.cooked}
                          onClick={() =>
                            markMealCooked(selection.isoYear, selection.isoWeek, entry.id)
                          }
                        >
                          {entry.cooked ? (
                            <span className="flex items-center justify-center gap-1">
                              <CheckIcon />
                              Cooked
                            </span>
                          ) : (
                            "Mark cooked"
                          )}
                        </button>

                        <input
                          value={entry.notes}
                          placeholder="Note…"
                          aria-label={`${slot} notes`}
                          className="text-xs"
                          onChange={(event) =>
                            updateWeekEntry(selection.isoYear, selection.isoWeek, entry.id, {
                              notes: event.target.value,
                            })
                          }
                        />

                        {entry.cooked ? (
                          <div className="space-y-2 rounded-2xl border border-dashed border-line p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                              Leftovers
                            </p>
                            <input
                              value={leftoverDraft.name}
                              placeholder="Item name"
                              aria-label="Leftover item name"
                              onChange={(event) =>
                                setLeftoverDrafts((current) => ({
                                  ...current,
                                  [entry.id]: { ...leftoverDraft, name: event.target.value },
                                }))
                              }
                            />
                            <div className="grid grid-cols-[1fr_1fr] gap-2">
                              <input
                                type="number"
                                inputMode="decimal"
                                min={0}
                                step={0.5}
                                value={leftoverDraft.quantity}
                                placeholder="Quantity"
                                aria-label="Leftover quantity"
                                onChange={(event) =>
                                  setLeftoverDrafts((current) => ({
                                    ...current,
                                    [entry.id]: {
                                      ...leftoverDraft,
                                      quantity: event.target.value,
                                    },
                                  }))
                                }
                              />
                              <select
                                value={leftoverDraft.unit}
                                aria-label="Leftover unit"
                                onChange={(event) =>
                                  setLeftoverDrafts((current) => ({
                                    ...current,
                                    [entry.id]: { ...leftoverDraft, unit: event.target.value },
                                  }))
                                }
                              >
                                <option value="pcs">pcs</option>
                                <option value="g">g</option>
                                <option value="ml">ml</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              className="w-full rounded-2xl px-3 py-2 text-sm font-semibold button-ghost"
                              onClick={() => {
                                if (!leftoverDraft.name || !leftoverDraft.quantity) return;
                                addLeftover(
                                  leftoverDraft.name,
                                  Number(leftoverDraft.quantity),
                                  leftoverDraft.unit,
                                  leftoverDraft.categoryId,
                                  `Saved after ${slot.toLowerCase()} on ${formatShortDate(date)}.`,
                                );
                                setLeftoverDrafts((current) => ({
                                  ...current,
                                  [entry.id]: {
                                    ...leftoverDraft,
                                    quantity: "",
                                  },
                                }));
                              }}
                            >
                              Add leftovers to pantry
                            </button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd /home/alexkhlopenko/claudeprojects/family-meal-planner && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/week-planner.tsx
git commit -m "fix(week-planner): text sizes, SVG check icon, aria-labels, inputMode, aria-live"
```

---

### Task 6: Recipes View — aria-labels, inputMode, Toast on Save, Confirm on Archive

**Files:**
- Modify: `src/components/recipes-view.tsx`

Changes:
1. Import `useToast` and `ConfirmDialog`.
2. Add `confirmArchiveId` state to track which recipe is pending archive.
3. Call `toast("Recipe saved")` after `createOrUpdateRecipe`.
4. Replace immediate `archiveRecipe` call with dialog flow.
5. Add `aria-label` and `inputMode` to all number inputs.

- [ ] **Step 1: Apply all recipes-view changes**

Replace `src/components/recipes-view.tsx` with:

```tsx
"use client";

import { startTransition, useDeferredValue, useMemo, useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { DIFFICULTIES, MEAL_SLOTS, UNIT_OPTIONS } from "@/lib/constants";
import { createId } from "@/lib/planner";
import { Recipe, RecipeDraft } from "@/lib/types";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
        description="This recipe will be hidden from the planner and recipe list. You can restore it later."
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
              aria-label="Search recipes"
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              value={mealFilter}
              aria-label="Filter by meal type"
              onChange={(event) => setMealFilter(event.target.value as typeof mealFilter)}
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
                aria-label="Recipe title"
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
              <select
                value={draft.mealType}
                aria-label="Meal type"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    mealType: event.target.value as RecipeDraft["mealType"],
                  }))
                }
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
                inputMode="numeric"
                min={1}
                value={draft.baseServings}
                aria-label="Base servings"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, baseServings: Number(event.target.value) }))
                }
                placeholder="Base servings"
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.prepTimeMinutes}
                aria-label="Prep time in minutes"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    prepTimeMinutes: Number(event.target.value),
                  }))
                }
                placeholder="Prep"
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.cookTimeMinutes}
                aria-label="Cook time in minutes"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cookTimeMinutes: Number(event.target.value),
                  }))
                }
                placeholder="Cook"
              />
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={draft.caloriesPerServing}
                aria-label="Calories per serving"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    caloriesPerServing: Number(event.target.value),
                  }))
                }
                placeholder="Calories"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
              <select
                value={draft.difficulty}
                aria-label="Difficulty"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    difficulty: event.target.value as RecipeDraft["difficulty"],
                  }))
                }
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
              aria-label="Recipe tags, comma separated"
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  tags: event.target.value
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean),
                }))
              }
            />

            <textarea
              value={draft.comments}
              placeholder="Comments for your family: what pairs well, what the kids loved, what to prep ahead."
              aria-label="Family comments"
              onChange={(event) =>
                setDraft((current) => ({ ...current, comments: event.target.value }))
              }
            />

            <textarea
              value={draft.instructions}
              placeholder="Quick instructions"
              aria-label="Instructions"
              onChange={(event) =>
                setDraft((current) => ({ ...current, instructions: event.target.value }))
              }
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
                      aria-label={`Ingredient ${index + 1} name`}
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
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.25}
                      value={ingredient.quantity}
                      aria-label={`Ingredient ${index + 1} quantity`}
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
                    />
                    <select
                      value={ingredient.unit}
                      aria-label={`Ingredient ${index + 1} unit`}
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
                    >
                      {UNIT_OPTIONS.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <select
                      value={ingredient.categoryId}
                      aria-label={`Ingredient ${index + 1} category`}
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
                    >
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      aria-label={`Remove ingredient ${index + 1}`}
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
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    value={ingredient.note}
                    placeholder="Optional note"
                    aria-label={`Ingredient ${index + 1} note`}
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
```

- [ ] **Step 2: Verify build**

```bash
cd /home/alexkhlopenko/claudeprojects/family-meal-planner && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/recipes-view.tsx
git commit -m "fix(recipes): aria-labels, inputMode, toast on save, confirm on archive"
```

---

### Task 7: Pantry View — aria-labels, Toast on Save, Confirm on Remove

**Files:**
- Modify: `src/components/pantry-view.tsx`

Changes:
1. Import `useToast` and `ConfirmDialog`.
2. Add `confirmRemoveId` state.
3. `toast("Stock saved")` after `addPantryAdjustment`.
4. Confirm before `removePantryItem`.
5. `aria-label` and `inputMode` on number inputs.

- [ ] **Step 1: Apply all pantry-view changes**

Replace `src/components/pantry-view.tsx` with:

```tsx
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
  const [draft, setDraft] = useState({
    name: "",
    quantity: 1,
    unit: "pcs",
    categoryId: categories[0]?.id ?? "pantry",
    note: "",
  });
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRemoveName, setConfirmRemoveName] = useState("");

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
                inputMode="decimal"
                min={0}
                step={0.25}
                value={draft.quantity}
                aria-label="Quantity"
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
                              inputMode="decimal"
                              min={0}
                              step={0.25}
                              value={item.quantity}
                              onChange={(event) =>
                                updatePantryItem(item.id, Number(event.target.value))
                              }
                              aria-label={`${item.name} quantity`}
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
```

- [ ] **Step 2: Verify build**

```bash
cd /home/alexkhlopenko/claudeprojects/family-meal-planner && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/pantry-view.tsx
git commit -m "fix(pantry): aria-labels, inputMode, toast on save, confirm on remove"
```

---

### Task 8: Shopping View — aria-labels, Toast on Add, Confirm on Remove

**Files:**
- Modify: `src/components/shopping-view.tsx`

Changes:
1. Import `useToast` and `ConfirmDialog`.
2. Add `confirmRemoveId` / `confirmRemoveName` state.
3. `toast("Item added")` after `addManualShoppingItem`.
4. Confirm before `removeManualShoppingItem`.
5. `aria-label` and `inputMode` on number inputs.

- [ ] **Step 1: Apply all shopping-view changes**

Replace `src/components/shopping-view.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import { usePlanner } from "@/components/planner-provider";
import { UNIT_OPTIONS } from "@/lib/constants";
import { formatRange, getWeekOptions } from "@/lib/date";
import { formatQuantity, groupByCategory } from "@/lib/planner";
import { useToast } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
                    title={`${boughtCount} of ${totalToBuy}`}
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
                    inputMode="decimal"
                    min={0}
                    step={0.25}
                    value={draft.quantity}
                    aria-label="Quantity"
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
                            <div className="font-semibold">{formatQuantity(item.needed, item.unit)}</div>
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
                            <div className="font-semibold">{formatQuantity(item.toBuy, item.unit)}</div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              className="rounded-2xl px-4 py-3 text-sm font-semibold button-secondary disabled:opacity-45"
                              disabled={item.bought}
                              onClick={() =>
                                markShoppingItemBought(selection.isoYear, selection.isoWeek, item.id)
                              }
                            >
                              {item.bought ? "Bought" : "Mark bought"}
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
```

- [ ] **Step 2: Verify build**

```bash
cd /home/alexkhlopenko/claudeprojects/family-meal-planner && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shopping-view.tsx
git commit -m "fix(shopping): aria-labels, inputMode, toast on add, confirm on remove"
```

---

## Self-Review

**Spec coverage check:**

| Issue | Covered |
|-------|---------|
| 1. Focus rings on buttons/links | Task 1 (globals.css `button:focus-visible`) |
| 2. Placeholder-only labels | Tasks 5–8 (`aria-label` on all unlabeled inputs) |
| 3. button-ghost base style | Task 1 (globals.css `.button-ghost { background: transparent }`) |
| 4. No success feedback | Tasks 6 (recipe save), 7 (pantry save), 8 (shopping add) |
| 5. No confirmation for destructive actions | Tasks 6 (archive), 7 (pantry remove), 8 (shopping remove) |
| 6. Sub-12px text | Task 5 (`text-xs` on all formerly `text-[10px]`/`text-[11px]`) |
| 7. Text `✓` as icon | Task 5 (inline SVG `CheckIcon` component) |
| 8. prefers-reduced-motion | Task 1 (globals.css `@media` block) |
| 9. Week planner mobile scroll | Not addressed — intentional 7-col grid; adding a mobile layout is a separate feature scope |
| 10. inputMode on number inputs | Tasks 5–8 |
| 11. Viewport meta | Task 2 |
| 12. html gradient hidden by body | Task 1 (gradient moved to `body`) |
| 13. letter-spacing at small sizes | Task 1 (`.section-title-large` scoped class) + Task 1 step 3 |
| 14. lang per recipe | Out of scope — noted, not actionable without a feature change |
| 15. aria-live on summary stats | Task 5 |

**Placeholder scan:** No TBDs or incomplete steps found.

**Type consistency:** All components use existing types from `@/lib/types`. New components (`Toast`, `ConfirmDialog`) use only local interfaces. No cross-task type mismatches.

**Note on issue #9 (mobile week view):** A full mobile-alternative layout (collapsible days, swipeable day view) is a feature addition beyond accessibility fixing and is out of scope for this plan. The `overflow-x-auto` wrapper and `minWidth` approach is acceptable.
