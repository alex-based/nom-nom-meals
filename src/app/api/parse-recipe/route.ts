import { NextRequest, NextResponse } from "next/server";
import { parseRecipeFromHtml } from "@/lib/recipe-parser";

/** Maximum bytes we will read from the remote page (2 MB). */
const MAX_BYTES = 2 * 1024 * 1024;

/** Fetch timeout per attempt in milliseconds. */
const FETCH_TIMEOUT_MS = 15_000;

/** Maximum number of fetch attempts (initial + retries). */
const MAX_ATTEMPTS = 3;

/**
 * A desktop Chrome UA string. Many recipe sites actively block requests
 * whose User-Agent does not look like a real browser.
 */
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/**
 * Returns Accept-Language that includes the target site's language based on
 * its TLD, so localised sites (e.g. .pl) prefer the right language.
 */
function acceptLanguage(hostname: string): string {
  const tldMap: Record<string, string> = {
    pl: "pl-PL,pl;q=0.9,en;q=0.8",
    de: "de-DE,de;q=0.9,en;q=0.8",
    fr: "fr-FR,fr;q=0.9,en;q=0.8",
    it: "it-IT,it;q=0.9,en;q=0.8",
    es: "es-ES,es;q=0.9,en;q=0.8",
    pt: "pt-PT,pt;q=0.9,en;q=0.8",
    nl: "nl-NL,nl;q=0.9,en;q=0.8",
  };
  const tld = hostname.split(".").pop() ?? "";
  return tldMap[tld] ?? "en-US,en;q=0.9";
}

/**
 * Fetches the URL with browser-like headers and retries on 429 / 5xx.
 * Respects the Retry-After header when present.
 */
async function fetchHtml(rawUrl: string): Promise<{ html: string } | { error: string; status: number }> {
  const parsedUrl = new URL(rawUrl);

  const headers: Record<string, string> = {
    "User-Agent": BROWSER_UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": acceptLanguage(parsedUrl.hostname),
    "Accept-Encoding": "gzip, deflate, br",
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    // Sec-Fetch headers make the request indistinguishable from a browser
    // navigation at the HTTP layer.
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
  };

  let lastStatus = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(rawUrl, { signal: controller.signal, headers, redirect: "follow" });
    } catch (err) {
      clearTimeout(timer);
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("abort") || message.toLowerCase().includes("timeout")) {
        return { error: "The request to the recipe page timed out.", status: 504 };
      }
      return { error: `Failed to fetch the recipe page: ${message}`, status: 502 };
    }
    clearTimeout(timer);

    lastStatus = response.status;

    // 429 Too Many Requests — wait and retry.
    if (response.status === 429) {
      if (attempt < MAX_ATTEMPTS - 1) {
        const retryAfter = response.headers.get("retry-after");
        // Honour Retry-After up to 8 s; otherwise use exponential backoff.
        const waitMs = retryAfter
          ? Math.min(parseInt(retryAfter, 10) * 1000, 8_000)
          : 2 ** attempt * 1_000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      return {
        error: "The recipe site is rate-limiting requests. Please wait a moment and try again.",
        status: 429,
      };
    }

    // Transient server errors — retry immediately.
    if (response.status >= 500 && attempt < MAX_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      continue;
    }

    if (!response.ok) {
      return {
        error:
          response.status === 403
            ? "The recipe site blocked the request (403). The site may require a browser session or have strict bot protection."
            : `Remote page returned HTTP ${response.status}.`,
        status: 502,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { error: "The URL does not appear to serve an HTML page.", status: 422 };
    }

    // Stream at most MAX_BYTES to avoid memory issues on large pages.
    const reader = response.body?.getReader();
    if (!reader) {
      return { error: "Could not read remote response.", status: 502 };
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

    const html = new TextDecoder().decode(
      chunks.reduce((acc, chunk) => {
        const merged = new Uint8Array(acc.length + chunk.length);
        merged.set(acc);
        merged.set(chunk, acc.length);
        return merged;
      }, new Uint8Array()),
    );

    return { html };
  }

  return { error: `Remote page returned HTTP ${lastStatus}.`, status: 502 };
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
    !("url" in body) ||
    typeof (body as Record<string, unknown>).url !== "string"
  ) {
    return NextResponse.json(
      { error: "Request body must include a string field 'url'." },
      { status: 400 },
    );
  }

  const rawUrl = ((body as Record<string, unknown>).url as string).trim();

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

  const result = await fetchHtml(rawUrl);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { draft, richData } = parseRecipeFromHtml(result.html);

  return NextResponse.json({ draft, richData });
}
