"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/week", label: "Week" },
  { href: "/recipes", label: "Recipes" },
  { href: "/shopping", label: "Shopping" },
  { href: "/pantry", label: "Pantry" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-7xl flex-col gap-4 rounded-[32px] glass-panel px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="pill inline-flex w-fit text-xs uppercase tracking-[0.28em] text-muted">
              Family Meal Planner
            </p>
            <div className="space-y-1">
              <h1 className="section-title section-title-large text-4xl text-foreground sm:text-5xl">
                Plan the week before the week plans you.
              </h1>
              <p className="max-w-2xl text-sm leading-6 section-subtitle sm:text-base">
                Recipes, groceries, and pantry inventory stay in one calm household flow,
                with just enough structure to feel effortless.
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "button-primary shadow-[0_12px_30px_rgba(162,79,39,0.18)]"
                      : "button-secondary text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
