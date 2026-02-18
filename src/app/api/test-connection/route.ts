import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { csCart } from "@/lib/cs-cart";

interface ConnectionResult {
  ok: boolean;
  message: string;
  data?: unknown;
}

export async function GET() {
  const results: { supabase: ConnectionResult; csCart: ConnectionResult } = {
    supabase: { ok: false, message: "Not tested" },
    csCart: { ok: false, message: "Not tested" },
  };

  /* ---- Supabase ---- */
  try {
    const supabase = createAdminClient();
    // Перевірка з'єднання через вбудований RPC auth.role()
    const { data, error } = await supabase.rpc("get_service_role" as never);

    // Будь-яка помилка крім мережевої означає, що з'єднання працює.
    // Функція може не існувати — це нормально, головне що Supabase відповів.
    if (error && error.message.includes("Could not find the function")) {
      results.supabase = {
        ok: true,
        message: "Supabase connection successful (authenticated)",
      };
    } else if (error) {
      // Перевіримо чи це не помилка з'єднання
      if (
        error.message.includes("fetch") ||
        error.message.includes("network") ||
        error.message.includes("ECONNREFUSED")
      ) {
        results.supabase = {
          ok: false,
          message: `Supabase connection failed: ${error.message}`,
        };
      } else {
        // Будь-яка інша помилка означає що сервер відповідає
        results.supabase = {
          ok: true,
          message: "Supabase connection successful",
          data: data ?? undefined,
        };
      }
    } else {
      results.supabase = {
        ok: true,
        message: "Supabase connection successful",
        data: data ?? undefined,
      };
    }
  } catch (err) {
    results.supabase = {
      ok: false,
      message: `Supabase exception: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  /* ---- CS-Cart ---- */
  try {
    const categories = await csCart.getCategories(1, 1);
    results.csCart = {
      ok: true,
      message: "CS-Cart API connection successful",
      data: {
        total_items: categories.params?.total_items ?? 0,
      },
    };
  } catch (err) {
    results.csCart = {
      ok: false,
      message: `CS-Cart exception: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  const allOk = results.supabase.ok && results.csCart.ok;

  return NextResponse.json(results, { status: allOk ? 200 : 503 });
}
