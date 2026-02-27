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
  name_ru: string | null;
  description_uk: string | null;
  description_ru: string | null;
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
  "ulka",
  "default category",
  "категория-корзина",
  "товары без категории",
  "тестовая группа",
  "!1c",
  "на удаление",
  "пилки бафы",
  "мебель для салонов",
  "папка с неотсортировкой",
  "outlet",
  "sale",
  "маникюр pro",
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

function mapCategory(
  cat: CSCartCategory,
  ruCat?: CSCartCategory | null,
): CategoryRow {
  return {
    cs_cart_id: cat.category_id,
    parent_cs_cart_id: cat.parent_id === 0 ? null : cat.parent_id,
    name_uk: cat.category,
    name_ru: ruCat?.category || null,
    description_uk: cat.description || null,
    description_ru: ruCat?.description || null,
    slug: slugify(cat.category) || `category-${cat.category_id}`,
    image_url: cat.main_pair?.detailed?.image_path ?? null,
    position: cat.position ?? 0,
    status: cat.status === "A" ? "active" : cat.status === "H" ? "hidden" : "disabled",
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

    console.info("[sync:categories] Starting full sync...");

    /* ---- 1b. Force mode: mark ALL categories as disabled first ---- */

    if (options.force) {
      console.info("[sync:categories] FORCE mode — disabling all existing categories...");
      const { error: forceErr } = await supabase
        .from("categories")
        .update({ status: "disabled" })
        .neq("status", "disabled");

      if (forceErr) {
        console.error("[sync:categories] Force disable error:", forceErr.message);
      } else {
        console.info("[sync:categories] All categories marked disabled. Re-syncing...");
      }
    }

    /* ---- 2. Завантажити ВСІ активні категорії з CS-Cart (UK + RU) ---- */

    async function fetchAllCategories(langCode: string): Promise<CSCartCategory[]> {
      const all: CSCartCategory[] = [];
      let pg = 1;
      let more = true;

      while (more) {
        console.info(`[sync:categories] [${langCode.toUpperCase()}] Fetching page ${pg}...`);

        const response = await csCart.getCategories(pg, ITEMS_PER_PAGE, {
          lang_code: langCode,
        });
        const categories = response.categories ?? [];
        all.push(...categories);

        const totalItems = Number(response.params?.total_items ?? 0);
        const fetched = pg * ITEMS_PER_PAGE;

        console.info(
          `[sync:categories] [${langCode.toUpperCase()}] Page ${pg}: got ${categories.length} items (${Math.min(fetched, totalItems)}/${totalItems})`,
        );

        more = categories.length === ITEMS_PER_PAGE && fetched < totalItems;
        pg++;
      }

      return all;
    }

    console.info("[sync:categories] Fetching UK and RU categories in parallel...");

    const [allCategories, allCategoriesRu] = await Promise.all([
      fetchAllCategories("uk"),
      fetchAllCategories("ru"),
    ]);

    console.info(
      `[sync:categories] Total fetched: UK=${allCategories.length}, RU=${allCategoriesRu.length}`,
    );

    // Build RU lookup map by category_id
    const ruMap = new Map<number, CSCartCategory>();
    for (const c of allCategoriesRu) {
      ruMap.set(c.category_id, c);
    }

    /* ---- 3. Маппінг та підготовка рядків ---- */

    // Filter out blacklisted categories (service/test)
    const cleanCategories = allCategories.filter((cat) => {
      if (isBlacklisted(cat.category)) {
        console.info(`[sync:categories] Skipping blacklisted: "${cat.category}" (id: ${cat.category_id})`);
        return false;
      }
      return true;
    });

    console.info(
      `[sync:categories] After blacklist filter: ${cleanCategories.length} (removed ${allCategories.length - cleanCategories.length})`,
    );

    const rows = deduplicateSlugs(
      cleanCategories.map((cat) => mapCategory(cat, ruMap.get(cat.category_id))),
    );
    const activeCsCartIds = new Set(rows.map((r) => r.cs_cart_id));
    itemsProcessed = rows.length;

    /* ---- 3b. Захистити вручну змінені slug та статус ---- */

    const { data: existingCats } = await supabase
      .from("categories")
      .select("cs_cart_id, slug, status")
      .in("cs_cart_id", rows.map((r) => r.cs_cart_id));

    const existingMap = new Map(
      (existingCats || []).map((c) => [c.cs_cart_id, c]),
    );

    for (const row of rows) {
      const existing = existingMap.get(row.cs_cart_id);
      if (existing) {
        row.slug = existing.slug;
        if (existing.status === "disabled" && row.status === "active") {
          row.status = "disabled";
        }
      }
    }

    /* ---- 4. Batch upsert у Supabase ---- */

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.info(
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

    console.info("[sync:categories] Soft-disabling removed categories...");

    const activeCsCartIdsArray = Array.from(activeCsCartIds);

    const { data: disabledRows, error: disableError } = await supabase
      .from("categories")
      .update({ status: "disabled" })
      .not("cs_cart_id", "in", `(${activeCsCartIdsArray.join(",")})`)
      .neq("status", "disabled")
      .select("id");

    if (disableError) {
      console.error(
        "[sync:categories] Failed to disable categories:",
        disableError.message,
      );
    } else {
      itemsDisabled = disabledRows?.length ?? 0;
      if (itemsDisabled > 0) {
        console.info(
          `[sync:categories] Disabled ${itemsDisabled} categories`,
        );
      } else {
        console.info("[sync:categories] No categories to disable");
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

    console.info(
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
