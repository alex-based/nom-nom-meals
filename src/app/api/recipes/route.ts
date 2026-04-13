import { NextRequest, NextResponse } from "next/server";
import { getAllRecipes, upsertRecipe } from "@/lib/recipe-store";
import type { Recipe } from "@/lib/types";

export async function GET() {
  return NextResponse.json(getAllRecipes());
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("id" in body) ||
    typeof (body as Record<string, unknown>).id !== "string"
  ) {
    return NextResponse.json({ error: "Recipe must have a string id." }, { status: 400 });
  }

  upsertRecipe(body as Recipe);
  return NextResponse.json(body);
}
