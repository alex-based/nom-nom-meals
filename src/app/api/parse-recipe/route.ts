import { NextRequest, NextResponse } from "next/server";
import { parseRecipeFromHtml } from "@/lib/recipe-parser";

/** Maximum bytes we will read from the remote page (2 MB). */
const MAX_BYTES = 2 * 1024 * 1024;

/** Fetch timeout in milliseconds. */
const FETCH_TIMEOUT_MS = 10_000;

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
    !("url" in body) ||
    typeof (body as Record<string, unknown>).url !== "string"
  ) {
    return NextResponse.json(
      { error: "Request body must include a string field 'url'." },
      { status: 400 },
    );
  }

  const rawUrl = ((body as Record<string, unknown>).url as string).trim();

  // Validate the URL and restrict to http(s).
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL." }, { status: 400 });
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return NextResponse.json(
      { error: "Only http and https URLs are supported." },
      { status: 400 },
    );
  }

  // Fetch the page server-side (avoids CORS issues from the browser).
  let html: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(rawUrl, {
      signal: controller.signal,
      headers: {
        // A realistic user agent helps avoid bot-detection blocks.
        "User-Agent":
          "Mozilla/5.0 (compatible; NomNomMeals/1.0; +https://github.com/nom-nom-meals) RecipeParser",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    clearTimeout(timer);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Remote page returned HTTP ${response.status}.` },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return NextResponse.json(
        { error: "The URL does not appear to serve an HTML page." },
        { status: 422 },
      );
    }

    // Read at most MAX_BYTES to avoid memory issues on huge pages.
    const reader = response.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: "Could not read remote response." }, { status: 502 });
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      totalBytes += value.byteLength;
      if (totalBytes >= MAX_BYTES) break;
    }
    reader.cancel().catch(() => undefined);

    html = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length);
        merged.set(acc);
        merged.set(chunk, acc.length);
        return merged;
      }, new Uint8Array()),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("abort") || message.includes("timeout")) {
      return NextResponse.json(
        { error: "The request to the recipe page timed out." },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { error: `Failed to fetch the recipe page: ${message}` },
      { status: 502 },
    );
  }

  const { draft, richData } = parseRecipeFromHtml(html);

  return NextResponse.json({ draft, richData });
}
