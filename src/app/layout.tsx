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
