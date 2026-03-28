# Family Meal Planner

A responsive household meal planner built with Next.js App Router.

## What’s implemented

- recipe creation with ingredients, timings, calories, tags, and dietary flags
- ISO-week meal planning for breakfast, lunch, and dinner
- automatic shopping-list generation with manual grocery additions
- pantry inventory with purchase, cooking, leftover, and manual-adjustment history

## Run locally

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Notes

- The app works immediately with browser `localStorage`, so there is no backend setup required for a first run.
- A Supabase-ready schema is included at `supabase/migrations/0001_family_meal_planner.sql` for the planned backend migration.
- The main product surfaces live under `src/app/week`, `src/app/recipes`, `src/app/shopping`, and `src/app/pantry`.
