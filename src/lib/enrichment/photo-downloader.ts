// ================================================================
//  Strong Nail Bits B2B — Photo Downloader → Supabase Storage
//  Downloads photos from brand websites and uploads to Storage
//  Path: products/{brand_slug}/{product_slug}/{n}.jpg
// ================================================================

import { createAdminClient } from '@/lib/supabase/admin';
import type { PhotoSource } from './types';

const STORAGE_BUCKET = 'products';

/**
 * Download photos from parsed URLs and upload to Supabase Storage.
 * Returns PhotoSource[] with storage URLs.
 *
 * Priority:
 * 1. Parsed from brand website (usually better quality) → source: 'parsed'
 * 2. From CS-Cart (already exists) → source: 'cs_cart'
 * 3. Manual upload → source: 'manual'
 */
export async function downloadAndUploadPhotos(
  product: { slug: string; brand_slug?: string },
  parsedPhotoUrls: string[],
  sourceFrom: string = 'brand_website',
): Promise<PhotoSource[]> {
  const supabase = createAdminClient();
  const results: PhotoSource[] = [];

  const brandSlug = product.brand_slug || 'unknown';
  const basePath = `${brandSlug}/${product.slug}`;

  // Ensure bucket exists (create if needed)
  await ensureBucket(supabase);

  for (let i = 0; i < parsedPhotoUrls.length; i++) {
    const photoUrl = parsedPhotoUrls[i];

    try {
      // Download photo
      const { buffer, contentType } = await downloadPhoto(photoUrl);

      // Determine extension
      const ext = getExtension(contentType, photoUrl);
      const storagePath = `${basePath}/${i + 1}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, buffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error(`[PhotoDownloader] Upload failed for ${photoUrl}:`, uploadError.message);
        continue;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(storagePath);

      // Determine photo type from index
      const photoType = i === 0 ? 'main' as const : guessPhotoType(photoUrl, i);

      results.push({
        url: publicUrlData.publicUrl,
        source: 'parsed',
        from: sourceFrom,
        type: photoType,
      });
    } catch (err) {
      console.error(`[PhotoDownloader] Failed to process ${photoUrl}:`, err);
      // Continue with next photo — don't stop pipeline
    }
  }

  return results;
}

/**
 * Download a single photo and return as buffer + content type.
 */
async function downloadPhoto(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'image/*,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    throw new Error(`Failed to download ${url}: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || 'image/jpeg';

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}

/**
 * Download photo as base64 (for Vision analysis).
 */
export async function downloadPhotoAsBase64(url: string): Promise<{
  base64: string;
  mediaType: string;
}> {
  const { buffer, contentType } = await downloadPhoto(url);
  return {
    base64: buffer.toString('base64'),
    mediaType: contentType,
  };
}

/**
 * Ensure the storage bucket exists.
 */
async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === STORAGE_BUCKET);

  if (!exists) {
    await supabase.storage.createBucket(STORAGE_BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024, // 10MB max
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    });
  }
}

/**
 * Get file extension from content type or URL.
 */
function getExtension(contentType: string, url: string): string {
  const mimeMap: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/avif': 'avif',
    'image/gif': 'gif',
  };

  if (mimeMap[contentType]) return mimeMap[contentType];

  // Try from URL
  const urlExt = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  if (urlExt && ['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif'].includes(urlExt)) {
    return urlExt === 'jpeg' ? 'jpg' : urlExt;
  }

  return 'jpg'; // Default
}

/**
 * Guess photo type from URL or index.
 */
function guessPhotoType(url: string, index: number): PhotoSource['type'] {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('swatch') || urlLower.includes('color')) return 'swatch';
  if (urlLower.includes('nail') || urlLower.includes('hand')) return 'nails';
  if (urlLower.includes('palette') || urlLower.includes('collection')) return 'palette';
  if (urlLower.includes('bottle') || urlLower.includes('product')) return 'bottle';
  if (index === 0) return 'main';
  return 'bottle';
}
