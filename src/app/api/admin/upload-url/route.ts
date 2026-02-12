// ================================================================
//  ShineShop OS — External Image Proxy Download
//  POST /api/admin/upload-url
//  Завантажує зображення за зовнішнім URL, зберігає в Supabase Storage
//  Використовується для drag & drop з інших сайтів
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

const BUCKET = 'product-images';
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const FETCH_TIMEOUT = 15_000; // 15 сек

export async function POST(request: NextRequest) {
  try {
    // 1. Авторизація
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    // 2. Отримати URL
    const body = await request.json();
    const { url } = body as { url: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL обов\'язковий' }, { status: 400 });
    }

    // Валідація URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Невалідний URL' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Тільки HTTP/HTTPS URL' }, { status: 400 });
    }

    // 3. Завантажити зображення
    console.log(`[Upload URL] ${auth.user.email} завантажує: ${url.slice(0, 100)}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    let res: Response;
    try {
      res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ShineShop/1.0)',
          'Accept': 'image/*',
        },
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === 'AbortError') {
        return NextResponse.json({ error: 'Таймаут завантаження (15 сек)' }, { status: 408 });
      }
      return NextResponse.json(
        { error: 'Не вдалося завантажити зображення з цього URL' },
        { status: 502 }
      );
    }
    clearTimeout(timeout);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Сервер повернув ${res.status}` },
        { status: 502 }
      );
    }

    // 4. Перевірити тип
    const contentType = res.headers.get('content-type')?.split(';')[0]?.trim() || '';
    const isImage = ALLOWED_TYPES.includes(contentType) || contentType.startsWith('image/');

    if (!isImage) {
      return NextResponse.json(
        { error: `Це не зображення (${contentType || 'невідомий тип'})` },
        { status: 400 }
      );
    }

    // 5. Прочитати тіло
    const buffer = await res.arrayBuffer();

    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { error: `Файл завеликий (${(buffer.byteLength / 1024 / 1024).toFixed(1)} МБ, макс. 15 МБ)` },
        { status: 400 }
      );
    }

    if (buffer.byteLength < 100) {
      return NextResponse.json(
        { error: 'Файл занадто малий — можливо це не зображення' },
        { status: 400 }
      );
    }

    // 6. Визначити розширення
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    };
    const ext = extMap[contentType] || guessExtFromUrl(url) || 'png';

    // 7. Зберегти в Supabase Storage
    const supabase = createAdminClient();

    // Переконатися що bucket існує
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const filename = `external-${timestamp}-${random}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, {
        contentType: contentType || 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Upload URL] Storage error:', uploadError.message);
      return NextResponse.json(
        { error: `Помилка збереження: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    console.log(`[Upload URL] Збережено: ${filename} (${(buffer.byteLength / 1024).toFixed(0)} KB)`);

    return NextResponse.json({
      ok: true,
      url: urlData.publicUrl,
      filename,
      originalUrl: url,
      size: buffer.byteLength,
    });
  } catch (err) {
    console.error('[Upload URL] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Невідома помилка' },
      { status: 500 }
    );
  }
}

function guessExtFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.(jpe?g|png|webp|gif)(\?|$)/i);
    return match ? match[1].toLowerCase().replace('jpeg', 'jpg') : null;
  } catch {
    return null;
  }
}
