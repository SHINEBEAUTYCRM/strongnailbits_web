import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/admin/auth";

/** Public auth routes — no admin check needed */
const AUTH_ROUTES = ["/account", "/login", "/register"];

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Fast path: skip for static assets ──
  if (!needsAuthCheck(pathname) && !isAdminRoute(pathname) && !isAdminAuthApi(pathname)) {
    return NextResponse.next({ request });
  }

  // ── Admin auth API routes — skip auth check ──
  if (isAdminAuthApi(pathname)) {
    return NextResponse.next({ request });
  }

  // ── Admin routes — check admin_session cookie ──
  if (isAdminRoute(pathname)) {
    const sessionToken = request.cookies.get(SESSION_COOKIE)?.value;

    // Public admin pages (login, register, unauthorized)
    if (isAdminPublic(pathname)) {
      // If already has session and on login page → redirect to dashboard
      if (sessionToken && pathname === "/admin/login") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
      return NextResponse.next({ request });
    }

    // Protected admin pages — require session cookie
    if (!sessionToken) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    // Session validation is done in getAdminUser() at the page level
    // (middleware can't call Supabase admin client efficiently)
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
