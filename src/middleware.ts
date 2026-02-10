import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Public auth routes — no admin check needed */
const AUTH_ROUTES = ["/account", "/login", "/register"];

/** Admin routes that DON'T require admin auth */
const ADMIN_PUBLIC = ["/admin/login", "/admin/register", "/admin/unauthorized", "/admin/reset-password"];

function needsAuthCheck(pathname: string): boolean {
  return AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

function isAdminRoute(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminPublic(pathname: string): boolean {
  return ADMIN_PUBLIC.some((r) => pathname === r || pathname.startsWith(r + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Fast path: skip for static assets, API, etc. ──
  if (!needsAuthCheck(pathname) && !isAdminRoute(pathname)) {
    return NextResponse.next({ request });
  }

  // ── Create Supabase client with cookie handling ──
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

  // ── Regular auth routes (/account, /login, /register) ──
  if (needsAuthCheck(pathname)) {
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

  // ── Admin routes ──
  if (isAdminRoute(pathname)) {
    // Public admin pages — login, register, unauthorized
    if (isAdminPublic(pathname)) {
      // If already logged in as admin, redirect to dashboard
      if (user && pathname === "/admin/login") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, admin_approved")
          .eq("id", user.id)
          .single();

        if (profile?.role && ["admin", "manager"].includes(profile.role) && profile.admin_approved) {
          const url = request.nextUrl.clone();
          url.pathname = "/admin";
          return NextResponse.redirect(url);
        }
      }
      return supabaseResponse;
    }

    // Protected admin pages — require auth + admin role + approval
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      return NextResponse.redirect(url);
    }

    // Check admin role and approval
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, admin_approved")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "manager"].includes(profile.role || "")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/unauthorized";
      return NextResponse.redirect(url);
    }

    if (!profile.admin_approved) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/unauthorized";
      url.searchParams.set("reason", "pending");
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
