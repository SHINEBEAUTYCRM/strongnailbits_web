import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for PageSpeed Insights API.
 * Using a server-side key avoids browser rate-limiting issues.
 * 
 * Set GOOGLE_PSI_KEY in your environment (Vercel dashboard) for higher limits.
 * Free tier: 25,000 queries/day with an API key vs 25/day without.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get("url");
  const strategy = searchParams.get("strategy") || "mobile";

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PSI_KEY || "";

  const psiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  psiUrl.searchParams.set("url", url);
  psiUrl.searchParams.set("strategy", strategy);
  psiUrl.searchParams.set("category", "PERFORMANCE");
  psiUrl.searchParams.append("category", "ACCESSIBILITY");
  psiUrl.searchParams.append("category", "BEST_PRACTICES");
  psiUrl.searchParams.append("category", "SEO");
  if (apiKey) {
    psiUrl.searchParams.set("key", apiKey);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min

    const res = await fetch(psiUrl.toString(), {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
    clearTimeout(timeout);

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || `Google API error ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json({ error: "Google API timeout (120s)" }, { status: 504 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
