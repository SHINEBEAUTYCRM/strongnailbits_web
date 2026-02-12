// ================================================================
//  ShineShop OS — PhotoRoom Batch Proxy
//  POST /api/photoroom/batch
//  Пакетна обробка до 10 зображень паралельно
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { checkRateLimit } from '@/lib/api/rate-limiter';

export const dynamic = 'force-dynamic';

const PHOTOROOM_API = 'https://image-api.photoroom.com/v2/edit';
const BUCKET = 'images';
const STORAGE_FOLDER = 'studio';
const RATE_LIMIT = 30;
const MAX_BATCH = 10;

interface BatchItem {
  imageUrl?: string;
  [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Авторизація
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    // 2. Rate limiting (враховуємо кількість зображень)
    const rateLimitKey = `photoroom:${auth.user.id}`;

    // 3. API Key
    const apiKey = process.env.PHOTOROOM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'PhotoRoom API не налаштований' },
        { status: 500 }
      );
    }

    // 4. Парсимо тіло запиту
    const body = await request.json();
    const items: BatchItem[] = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Потрібен масив items' },
        { status: 400 }
      );
    }

    if (items.length > MAX_BATCH) {
      return NextResponse.json(
        { error: `Максимум ${MAX_BATCH} зображень за раз` },
        { status: 400 }
      );
    }

    // Перевірка rate limit для всієї пачки
    const rl = checkRateLimit(rateLimitKey, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Перевищено ліміт запитів. Спробуйте через ${Math.ceil((rl.resetAt - Date.now()) / 1000)} сек.` },
        { status: 429 }
      );
    }

    const supabase = createAdminClient();

    // Переконатися що bucket існує
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 20 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
    }

    // 5. Обробити паралельно через Promise.allSettled
    const results = await Promise.allSettled(
      items.map(async (item) => {
        // Формуємо FormData для PhotoRoom
        const fd = new FormData();

        for (const [key, value] of Object.entries(item)) {
          if (value !== undefined && value !== null) {
            fd.append(key === 'imageUrl' ? 'imageUrl' : key, value);
          }
        }

        const photoRoomRes = await fetch(PHOTOROOM_API, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Accept': 'image/png, application/json',
          },
          body: fd,
        });

        if (!photoRoomRes.ok) {
          const contentType = photoRoomRes.headers.get('content-type') || '';
          let msg = `PhotoRoom ${photoRoomRes.status}`;
          if (contentType.includes('application/json')) {
            const errBody = await photoRoomRes.json().catch(() => null);
            if (errBody) msg = errBody.message || errBody.error || msg;
          }
          throw new Error(msg);
        }

        const imageBuffer = await photoRoomRes.arrayBuffer();

        // Зберегти в Supabase Storage
        const timestamp = Date.now();
        const random = Math.random().toString(36).slice(2, 8);
        const fileName = `${STORAGE_FOLDER}/${timestamp}-${random}.png`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: false,
          });

        if (uploadError) throw new Error(uploadError.message);

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

        return { url: urlData.publicUrl, fileName };
      })
    );

    // 6. Форматуємо результати
    const formatted = results.map((r) => {
      if (r.status === 'fulfilled') {
        return { status: 'fulfilled' as const, value: r.value };
      }
      return {
        status: 'rejected' as const,
        reason: r.reason instanceof Error ? r.reason.message : 'Невідома помилка',
      };
    });

    return NextResponse.json(formatted);
  } catch (err) {
    console.error('[PhotoRoom Batch] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Невідома помилка' },
      { status: 500 }
    );
  }
}
