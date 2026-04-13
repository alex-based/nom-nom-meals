import { NextRequest, NextResponse } from "next/server";
import { getData, setData } from "@/lib/server-store";

export async function GET() {
  return NextResponse.json(getData() ?? null);
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  setData(body);
  return NextResponse.json({ ok: true });
}
