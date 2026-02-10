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

  console.log("[PSI Proxy] url:", url, "strategy:", strategy, "hasKey:", !!apiKey);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000); // 2 min

    const res = await fetch(psiUrl, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });
    clearTimeout(timeout);

    const text = await res.text();
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(text);
    } catch {
      console.error("[PSI Proxy] Invalid JSON:", text.slice(0, 500));
      return NextResponse.json({ error: `Invalid response from Google: ${text.slice(0, 200)}` }, { status: 502 });
    }

    if (!res.ok) {
      const errObj = data?.error as Record<string, unknown> | undefined;
      const msg = (errObj?.message as string) || `Google API error ${res.status}`;
      console.error("[PSI Proxy] Google error:", res.status, msg);
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
