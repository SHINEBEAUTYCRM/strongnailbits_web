import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin/auth";

/* ------------------------------------------------------------------ */
/*  Redirects cache (in-memory, TTL 5 min)                             */
/* ------------------------------------------------------------------ */

let redirectCache: Map<string, { to_path: string; code: number }> | null = null;
let redirectCacheTs = 0;
const REDIRECT_TTL = 5 * 60 * 1000;

async function getRedirectMap(): Promise<Map<string, { to_path: string; code: number }>> {
  const now = Date.now();
  if (redirectCache && now - redirectCacheTs < REDIRECT_TTL) return redirectCache;

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from("redirects")
      .select("from_path, to_path, code")
      .eq("is_active", true);

    const map = new Map<string, { to_path: string; code: number }>();
    for (const r of data ?? []) {
      map.set(r.from_path, { to_path: r.to_path, code: r.code });
    }
    redirectCache = map;
    redirectCacheTs = now;
    return map;
  } catch {
    return redirectCache ?? new Map();
  }
}

/** Public auth routes — no admin check needed */
const AUTH_ROUTES = ["/account", "/login", "/register"];

/** OAuth callback — must be publicly accessible */
const OAUTH_CALLBACK = "/auth/callback";

/** Admin routes that DON'T require admin auth */
const ADMIN_PUBLIC = ["/admin/login", "/admin/register", "/admin/unauthorized", "/admin/reset-password"];

/** Admin API routes that DON'T require admin auth */
const ADMIN_AUTH_API = [
  "/api/admin/auth/request",
  "/api/admin/auth/confirm",
  "/api/admin/auth/check",
  "/api/admin/auth/telegram-webhook",
  "/api/admin/auth/logout",
];

function needsAuthCheck(pathname: string): boolean {
  return AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminPublic(pathname: string): boolean {
  return ADMIN_PUBLIC.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function isAdminAuthApi(pathname: string): boolean {
  return ADMIN_AUTH_API.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function isAdminApi(pathname: string): boolean {
  return pathname.startsWith("/api/admin/");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Redirect check (cached map, skips static/api/admin) ──
  if (
    !pathname.startsWith("/_next") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/admin") &&
    !pathname.includes(".")
  ) {
    const redirectMap = await getRedirectMap();
    const match = redirectMap.get(pathname);
    if (match) {
      const url = new URL(match.to_path, request.url);
      return NextResponse.redirect(url, match.code as 301 | 302);
    }
  }

  // ── OAuth callback — let it through without auth check ──
  if (pathname.startsWith(OAUTH_CALLBACK)) {
    return NextResponse.next({ request });
  }

  // ── Fast path: skip for static assets ──
  if (!needsAuthCheck(pathname) && !isAdminRoute(pathname) && !isAdminApi(pathname)) {
    return NextResponse.next({ request });
  }

  // ── Admin auth API routes — skip auth check ──
  if (isAdminAuthApi(pathname)) {
    return NextResponse.next({ request });
  }

  // TODO: re-enable auth after setup
  // ── Admin API routes — require session cookie ──
  if (isAdminApi(pathname)) {
    // const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;
    // if (!sessionToken) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }
    return NextResponse.next({ request });
  }

  // ── Admin routes — check admin_session cookie ──
  if (isAdminRoute(pathname)) {
    // const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

    // if (isAdminPublic(pathname)) {
    //   if (sessionToken && pathname === "/admin/login") {
    //     const url = request.nextUrl.clone();
    //     url.pathname = "/admin";
    //     return NextResponse.redirect(url);
    //   }
    //   return NextResponse.next({ request });
    // }

    // if (!sessionToken) {
    //   const url = request.nextUrl.clone();
    //   url.pathname = "/admin/login";
    //   return NextResponse.redirect(url);
    // }

    return NextResponse.next({ request });
  }

  // ── Regular auth routes (/account, /login, /register) — Supabase Auth ──
  if (needsAuthCheck(pathname)) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && pathname.startsWith("/account")) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }

    if (user && (pathname === "/login" || pathname === "/register")) {
      const url = request.nextUrl.clone();
      url.pathname = "/account";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
