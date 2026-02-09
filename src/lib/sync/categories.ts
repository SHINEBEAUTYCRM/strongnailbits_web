import { createAdminClient } from "@/lib/supabase/admin";
import { csCart } from "@/lib/cs-cart";
import { slugify } from "@/utils/slugify";
import type { CSCartCategory } from "@/types/cs-cart";

/* ------------------------------------------------------------------ */
/*  Типи                                                               */
/* ------------------------------------------------------------------ */

export interface SyncResult {
  entity: string;
  status: "completed" | "failed";
  items_processed: number;
  items_created: number;
  items_updated: number;
  items_failed: number;
  items_disabled: number;
  duration_ms: number;
  error?: string;
}

interface CategoryRow {
  cs_cart_id: number;
  parent_cs_cart_id: number | null;
  name_uk: string;
  slug: string;
  image_url: string | null;
  position: number;
  status: string;
  product_count: number;
}

/* ------------------------------------------------------------------ */
/*  Константи                                                          */
/* ------------------------------------------------------------------ */

const ITEMS_PER_PAGE = 250;
const BATCH_SIZE = 100;

/** Category names to exclude (service/test categories that may have status A in CS-Cart) */
const BLACKLISTED_NAMES = [
  "удалить",
  "удалити",
  "видалити",
  "тест",
  "test",
  "temp",
  "tmp",
  "trash",
  "корзина",
  "ulka",  // brand miscategorized as root category in CS-Cart
];

function isBlacklisted(name: string): boolean {
  const lower = name.toLowerCase().trim();
  return BLACKLISTED_NAMES.some(
    (bl) => lower === bl || lower.startsWith(bl + " ") || lower.startsWith(bl + "_"),
  );
}

/* ------------------------------------------------------------------ */
/*  Маппінг CS-Cart → Supabase                                        */
/* ------------------------------------------------------------------ */

function mapCategory(cat: CSCartCategory): CategoryRow {
  return {
    cs_cart_id: cat.category_id,
    parent_cs_cart_id: cat.parent_id === 0 ? null : cat.parent_id,
    name_uk: cat.category,
    slug: slugify(cat.category) || `category-${cat.category_id}`,
    image_url: cat.main_pair?.detailed?.image_path ?? null,
    position: cat.position ?? 0,
    status: cat.status === "A" ? "active" : "disabled",
    product_count: cat.product_count ?? 0,
  };
}

/* ------------------------------------------------------------------ */
/*  Забезпечити унікальність slug'ів                                   */
/* ------------------------------------------------------------------ */

function deduplicateSlugs(rows: CategoryRow[]): CategoryRow[] {
  const slugCount = new Map<string, number>();

  return rows.map((row) => {
    const base = row.slug;
    const count = slugCount.get(base) ?? 0;

    if (count > 0) {
      row.slug = `${base}-${row.cs_cart_id}`;
    }

    slugCount.set(base, count + 1);
    return row;
  });
}

/* ------------------------------------------------------------------ */
/*  Головна функція синхронізації                                      */
/* ------------------------------------------------------------------ */

export async function syncCategories(
  options: { force?: boolean } = {},
): Promise<SyncResult> {
  const startTime = Date.now();
  const supabase = createAdminClient();

  let logId: string | null = null;
  let itemsProcessed = 0;
  let itemsCreated = 0;
  let itemsUpdated = 0;
  let itemsFailed = 0;
  let itemsDisabled = 0;

  try {
    /* ---- 1. Створити запис в sync_log ---- */

    const { data: logEntry, error: logError } = await supabase
      .from("sync_log")
      .insert({
        entity: "categories",
        action: "full_sync",
        status: "started",
      })
      .select("id")
      .single();

    if (logError) {
      console.error("[sync:categories] Failed to create sync_log:", logError.message);
    } else {
      logId = logEntry.id;
    }

    console.log("[sync:categories] Starting full sync...");

    /* ---- 1b. Force mode: mark ALL categories as disabled first ---- */

    if (options.force) {
      console.log("[sync:categories] FORCE mode — disabling all existing categories...");
      const { error: forceErr } = await supabase
        .from("categories")
        .update({ status: "disabled" })
        .neq("status", "disabled");

      if (forceErr) {
        console.error("[sync:categories] Force disable error:", forceErr.message);
      } else {
        console.log("[sync:categories] All categories marked disabled. Re-syncing...");
      }
    }

    /* ---- 2. Завантажити ВСІ активні категорії з CS-Cart ---- */

    const allCategories: CSCartCategory[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`[sync:categories] Fetching page ${page}...`);

      const response = await csCart.getCategories(page, ITEMS_PER_PAGE, { status: "A" });
      const categories = response.categories ?? [];

      allCategories.push(...categories);

      const totalItems = Number(response.params?.total_items ?? 0);
      const fetched = page * ITEMS_PER_PAGE;

      console.log(
        `[sync:categories] Page ${page}: got ${categories.length} items (${Math.min(fetched, totalItems)}/${totalItems})`,
      );

      hasMore = categories.length === ITEMS_PER_PAGE && fetched < totalItems;
      page++;
    }

    console.log(`[sync:categories] Total fetched from CS-Cart: ${allCategories.length}`);

    /* ---- 3. Маппінг та підготовка рядків ---- */

    // Filter out blacklisted categories (service/test)
    const cleanCategories = allCategories.filter((cat) => {
      if (isBlacklisted(cat.category)) {
        console.log(`[sync:categories] Skipping blacklisted: "${cat.category}" (id: ${cat.category_id})`);
        return false;
      }
      return true;
    });

    console.log(
      `[sync:categories] After blacklist filter: ${cleanCategories.length} (removed ${allCategories.length - cleanCategories.length})`,
    );

    const rows = deduplicateSlugs(cleanCategories.map(mapCategory));
    const activeCsCartIds = new Set(rows.map((r) => r.cs_cart_id));
    itemsProcessed = rows.length;

    /* ---- 4. Batch upsert у Supabase ---- */

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.log(
        `[sync:categories] Upserting batch ${batchNum} (${batch.length} items)...`,
      );

      const { data, error } = await supabase
        .from("categories")
        .upsert(batch, {
          onConflict: "cs_cart_id",
          ignoreDuplicates: false,
        })
        .select("id, cs_cart_id");

      if (error) {
        console.error(
          `[sync:categories] Batch ${batchNum} error: ${error.message}`,
        );
        itemsFailed += batch.length;
      } else {
        // Supabase upsert не розрізняє created/updated в response,
        // рахуємо всі успішні як updated (приблизна метрика)
        const count = data?.length ?? batch.length;
        itemsUpdated += count;
      }
    }

    // Коригуємо: якщо це перший sync, все — created
    // Для точності перераховуємо created = processed - failed - (існуючі до sync)
    // Спрощено: вважаємо всі успішні як updated
    itemsCreated = 0; // Supabase не розрізняє insert/update при upsert

    /* ---- 5. Позначити відсутні категорії як disabled ---- */
    /*
     * Логіка: disabled стають тільки ті категорії, яких НЕМАЄ
     * у вигрузці CS-Cart, але які зараз active в Supabase.
     * Використовуємо NOT IN по cs_cart_id.
     */

    console.log("[sync:categories] Hard-deleting removed/inactive categories...");

    const activeCsCartIdsArray = Array.from(activeCsCartIds);

    // Hard DELETE categories that no longer exist in CS-Cart
    const { data: deletedRows, error: deleteError } = await supabase
      .from("categories")
      .delete()
      .not("cs_cart_id", "in", `(${activeCsCartIdsArray.join(",")})`)
      .select("id");

    if (deleteError) {
      console.error(
        "[sync:categories] Failed to delete categories:",
        deleteError.message,
      );
    } else {
      itemsDisabled = deletedRows?.length ?? 0;
      if (itemsDisabled > 0) {
        console.log(
          `[sync:categories] Deleted ${itemsDisabled} categories`,
        );
      } else {
        console.log("[sync:categories] No categories to delete");
      }
    }

    /* ---- 6. Оновити sync_log ---- */

    const duration = Date.now() - startTime;

    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "completed",
          items_processed: itemsProcessed,
          items_created: itemsCreated,
          items_updated: itemsUpdated,
          items_failed: itemsFailed,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    console.log(
      `[sync:categories] ✓ Completed in ${duration}ms — ` +
        `processed: ${itemsProcessed}, updated: ${itemsUpdated}, ` +
        `failed: ${itemsFailed}, disabled: ${itemsDisabled}`,
    );

    return {
      entity: "categories",
      status: "completed",
      items_processed: itemsProcessed,
      items_created: itemsCreated,
      items_updated: itemsUpdated,
      items_failed: itemsFailed,
      items_disabled: itemsDisabled,
      duration_ms: duration,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : String(err);

    console.error(`[sync:categories] ✗ Failed after ${duration}ms:`, errorMessage);

    /* Оновити sync_log як failed */
    if (logId) {
      await supabase
        .from("sync_log")
        .update({
          status: "failed",
          items_processed: itemsProcessed,
          items_created: itemsCreated,
          items_updated: itemsUpdated,
          items_failed: itemsFailed,
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
        })
        .eq("id", logId);
    }

    return {
      entity: "categories",
      status: "failed",
      items_processed: itemsProcessed,
      items_created: itemsCreated,
      items_updated: itemsUpdated,
      items_failed: itemsFailed,
      items_disabled: itemsDisabled,
      duration_ms: duration,
      error: errorMessage,
    };
  }
}
