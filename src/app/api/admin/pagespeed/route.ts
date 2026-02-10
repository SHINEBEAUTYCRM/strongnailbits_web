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

  // Build URL string manually — URLSearchParams encodes "category" duplicates
  // and "best-practices" inconsistently across runtimes
  const params = [
    `url=${encodeURIComponent(url)}`,
    `strategy=${strategy}`,
    `category=performance`,
    `category=accessibility`,
    `category=best-practices`,
    `category=seo`,
  ];
  if (apiKey) params.push(`key=${apiKey}`);
  const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.join("&")}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min

    const res = await fetch(psiUrl, {
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
