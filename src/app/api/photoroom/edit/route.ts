// ================================================================
//  ShineShop OS — PhotoRoom Edit Proxy
//  POST /api/photoroom/edit
//  Проксує запити до PhotoRoom API v2, результат зберігає в Supabase Storage
// ================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';
import { checkRateLimit } from '@/lib/api/rate-limiter';

export const dynamic = 'force-dynamic';

const PHOTOROOM_API = 'https://image-api.photoroom.com/v2/edit';
const BUCKET = 'images';
const STORAGE_FOLDER = 'studio';
const RATE_LIMIT = 30; // запитів на хвилину

export async function POST(request: NextRequest) {
  try {
    // 1. Авторизація
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    // 2. Rate limiting
    const rateLimitKey = `photoroom:${auth.user.id}`;
    const rl = checkRateLimit(rateLimitKey, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Перевищено ліміт запитів. Спробуйте через ${Math.ceil((rl.resetAt - Date.now()) / 1000)} сек.` },
        { status: 429, headers: { 'Retry-After': Math.ceil((rl.resetAt - Date.now()) / 1000).toString() } }
      );
    }

    // 3. API Key
    const apiKey = process.env.PHOTOROOM_API_KEY;
    if (!apiKey) {
      console.error('[PhotoRoom] PHOTOROOM_API_KEY не налаштований');
      return NextResponse.json(
        { error: 'PhotoRoom API не налаштований. Зверніться до адміністратора.' },
        { status: 500 }
      );
    }

    // 4. Прочитати FormData від клієнта
    const clientFormData = await request.formData();

    // 5. Сформувати FormData для PhotoRoom
    const photoRoomForm = new FormData();

    // Обробити джерело зображення
    const imageFile = clientFormData.get('imageFile') as File | null;
    const imageUrl = clientFormData.get('imageUrl') as string | null;

    if (imageFile) {
      photoRoomForm.append('imageFile', imageFile);
    } else if (imageUrl) {
      photoRoomForm.append('imageUrl', imageUrl);
    } else {
      return NextResponse.json(
        { error: 'Необхідно передати imageFile або imageUrl' },
        { status: 400 }
      );
    }

    // Копіюємо всі інші параметри
    const passthrough = [
      'background.remove',
      'background.prompt',
      'background.prompt.expansion',
      'background.color',
      'shadow.mode',
      'lighting.mode',
      'upscale',
      'text.removal.mode',
      'padding',
      'margin',
      'outputSize.width',
      'outputSize.height',
    ];

    for (const key of passthrough) {
      const val = clientFormData.get(key);
      if (val !== null) {
        photoRoomForm.append(key, val as string);
      }
    }

    // 6. Запит до PhotoRoom API
    console.log(`[PhotoRoom] Запит від ${auth.user.email}, дія: ${describeAction(clientFormData)}`);

    const photoRoomRes = await fetch(PHOTOROOM_API, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Accept': 'image/png, application/json',
      },
      body: photoRoomForm,
    });

    // 7. Обробка помилки від PhotoRoom
    if (!photoRoomRes.ok) {
      const contentType = photoRoomRes.headers.get('content-type') || '';
      let errorMessage = `PhotoRoom помилка: ${photoRoomRes.status}`;

      if (contentType.includes('application/json')) {
        const errBody = await photoRoomRes.json().catch(() => null);
        if (errBody) {
          errorMessage = errBody.message || errBody.error || errorMessage;
          console.error('[PhotoRoom] API Error:', JSON.stringify(errBody));
        }
      } else {
        const text = await photoRoomRes.text().catch(() => '');
        console.error('[PhotoRoom] API Error (non-JSON):', text.slice(0, 500));
      }

      return NextResponse.json({ error: errorMessage }, { status: photoRoomRes.status });
    }

    // 8. Отримати зображення
    const imageBuffer = await photoRoomRes.arrayBuffer();

    // 9. Завантажити в Supabase Storage
    const supabase = createAdminClient();

    // Перевірити / створити bucket
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((b) => b.name === BUCKET);
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 20 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
      });
    }

    // Згенерувати унікальне ім'я файлу
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const fileName = `${STORAGE_FOLDER}/${timestamp}-${random}.png`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('[PhotoRoom] Upload error:', uploadError.message);
      return NextResponse.json(
        { error: `Помилка збереження: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 10. Повернути публічний URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);

    console.log(`[PhotoRoom] Успіх: ${fileName}`);

    return NextResponse.json({
      url: urlData.publicUrl,
      fileName,
    });
  } catch (err) {
    console.error('[PhotoRoom] Unexpected error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Невідома помилка' },
      { status: 500 }
    );
  }
}

/** Опис дії для логування */
function describeAction(fd: FormData): string {
  const parts: string[] = [];
  if (fd.get('background.remove')) parts.push('remove-bg');
  if (fd.get('background.prompt')) parts.push('ai-bg');
  if (fd.get('shadow.mode')) parts.push('shadow');
  if (fd.get('lighting.mode')) parts.push('relight');
  if (fd.get('upscale')) parts.push('upscale');
  if (fd.get('text.removal.mode')) parts.push('text-remove');
  return parts.join('+') || 'edit';
}
