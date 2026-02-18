import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import sharp from 'sharp';

interface DownloadRequest {
  productId: string;
  imageUrls: string[];
  setAsMain?: boolean;
}

interface DownloadResult {
  original: string;
  stored: string;
  size: number;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: DownloadRequest = await request.json();

    if (!body.productId || !body.imageUrls?.length) {
      return NextResponse.json({ error: 'Missing productId or imageUrls' }, { status: 400 });
    }

    if (body.imageUrls.length > 20) {
      return NextResponse.json({ error: 'Max 20 images per request' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const results: DownloadResult[] = [];

    for (let i = 0; i < body.imageUrls.length; i++) {
      const imageUrl = body.imageUrls[i];

      try {
        const res = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)',
            Referer: new URL(imageUrl).origin,
          },
          signal: AbortSignal.timeout(30_000),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const arrayBuf = await res.arrayBuffer();
        if (arrayBuf.byteLength > 10 * 1024 * 1024) {
          throw new Error('Image too large (>10MB)');
        }

        const buffer = Buffer.from(arrayBuf);

        const webpBuffer = await sharp(buffer)
          .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer();

        const filename =
          i === 0 && body.setAsMain ? 'main.webp' : `gallery_${i}.webp`;

        const storagePath = `products/${body.productId}/${filename}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(storagePath, webpBuffer, {
            contentType: 'image/webp',
            upsert: true,
          });

        if (uploadError) throw new Error(uploadError.message);

        const {
          data: { publicUrl },
        } = supabase.storage.from('product-images').getPublicUrl(storagePath);

        results.push({
          original: imageUrl,
          stored: publicUrl,
          size: webpBuffer.length,
          success: true,
        });
      } catch (err) {
        results.push({
          original: imageUrl,
          stored: '',
          size: 0,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successfulImages = results.filter((r) => r.success);

    if (successfulImages.length > 0) {
      const updateData: Record<string, unknown> = {};

      if (body.setAsMain && successfulImages[0]) {
        updateData.main_image_url = successfulImages[0].stored;
      }

      const galleryImages = body.setAsMain
        ? successfulImages.slice(1).map((r) => r.stored)
        : successfulImages.map((r) => r.stored);

      if (galleryImages.length > 0) {
        const { data: product } = await supabase
          .from('products')
          .select('images')
          .eq('id', body.productId)
          .single();

        const existingImages = (product?.images as string[]) || [];
        updateData.images = [...existingImages, ...galleryImages];
      }

      if (Object.keys(updateData).length > 0) {
        await supabase.from('products').update(updateData).eq('id', body.productId);
      }
    }

    return NextResponse.json({
      total: body.imageUrls.length,
      success: successfulImages.length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (err) {
    console.error('[AI Download Images]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
