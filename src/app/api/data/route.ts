import { NextRequest, NextResponse } from "next/server";
import { getData, setData } from "@/lib/server-store";

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB

/** Minimal structural check — prevents garbage overwrites without a heavy schema library. */
function isValidStorageShape(body: unknown): boolean {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const d = body as Record<string, unknown>;
  return (
    Array.isArray(d.recipes) &&
    Array.isArray(d.pantryItems) &&
    Array.isArray(d.inventoryTransactions) &&
    Array.isArray(d.weekEntries) &&
    Array.isArray(d.manualShoppingItems) &&
    Array.isArray(d.boughtItemIds)
  );
}

export async function GET() {
  const data = await getData();
  return NextResponse.json(data ?? null);
}

export async function POST(request: NextRequest) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isValidStorageShape(body)) {
    return NextResponse.json({ error: "Invalid data structure." }, { status: 400 });
  }

  await setData(body);
  return NextResponse.json({ ok: true });
}
