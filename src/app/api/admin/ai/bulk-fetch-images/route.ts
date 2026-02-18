import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import sharp from 'sharp';
import * as cheerio from 'cheerio';

interface BulkFetchRequest {
  brandId: string;
  productIds: string[];
  options: {
    downloadMain: boolean;
    downloadGallery: boolean;
    maxGalleryImages: number;
    skipExisting: boolean;
    convertToWebp: boolean;
  };
}

interface ProductImageResult {
  id: string;
  name: string;
  status: 'success' | 'skipped' | 'not_found' | 'error';
  imagesFound: number;
  imagesDownloaded: number;
  error?: string;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const FETCH_OPTS: RequestInit = {
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)' },
  signal: AbortSignal.timeout(10_000),
};

export async function POST(request: NextRequest) {
  try {
    const body: BulkFetchRequest = await request.json();

    if (!body.brandId || !body.productIds?.length) {
      return NextResponse.json({ error: 'Missing brandId or productIds' }, { status: 400 });
    }
    if (body.productIds.length > 10) {
      return NextResponse.json({ error: 'Max 10 products per batch' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: brand } = await supabase
      .from('brands')
      .select('name, source_urls')
      .eq('id', body.brandId)
      .single();

    if (!brand?.source_urls?.length) {
      return NextResponse.json({ error: 'Brand has no source URLs configured' }, { status: 400 });
    }

    const { data: products } = await supabase
      .from('products')
      .select('id, name_uk, name_ru, sku, main_image_url, images')
      .in('id', body.productIds);

    if (!products?.length) {
      return NextResponse.json({ error: 'No products found' }, { status: 400 });
    }

    const results: ProductImageResult[] = [];

    for (const product of products) {
      const name = product.name_uk || product.name_ru || '';
      const hasMain = !!product.main_image_url;
      const existingImages = (product.images as string[]) || [];

      if (body.options.skipExisting && hasMain && existingImages.length >= 3) {
        results.push({
          id: product.id,
          name,
          status: 'skipped',
          imagesFound: 0,
          imagesDownloaded: 0,
        });
        continue;
      }

      try {
        const pageImages = await findProductImages(
          brand.source_urls,
          name,
          product.sku,
        );

        if (!pageImages.length) {
          results.push({
            id: product.id,
            name,
            status: 'not_found',
            imagesFound: 0,
            imagesDownloaded: 0,
          });
          await delay(2000);
          continue;
        }

        const productImages = pageImages.filter((img) => img.isProduct);
        const toDownload: string[] = [];

        if (body.options.downloadMain && !hasMain && productImages[0]) {
          toDownload.push(productImages[0].src);
        }

        if (body.options.downloadGallery) {
          const startIdx = toDownload.length > 0 ? 1 : 0;
          const galleryMax = body.options.maxGalleryImages || 5;
          for (let i = startIdx; i < productImages.length && toDownload.length < galleryMax + (body.options.downloadMain ? 1 : 0); i++) {
            toDownload.push(productImages[i].src);
          }
        }

        if (!toDownload.length) {
          results.push({
            id: product.id,
            name,
            status: 'skipped',
            imagesFound: productImages.length,
            imagesDownloaded: 0,
          });
          continue;
        }

        let downloaded = 0;
        const storedUrls: string[] = [];

        for (let i = 0; i < toDownload.length; i++) {
          try {
            const imgRes = await fetch(toDownload[i], {
              headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ShineShopBot/1.0)',
                Referer: new URL(toDownload[i]).origin,
              },
              signal: AbortSignal.timeout(30_000),
            });

            if (!imgRes.ok) continue;

            const arrayBuf = await imgRes.arrayBuffer();
            if (arrayBuf.byteLength > 10 * 1024 * 1024) continue;

            const buffer = Buffer.from(arrayBuf);
            let outputBuffer: Buffer;

            if (body.options.convertToWebp) {
              outputBuffer = await sharp(buffer)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 85 })
                .toBuffer();
            } else {
              outputBuffer = await sharp(buffer)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .toBuffer();
            }

            const ext = body.options.convertToWebp ? 'webp' : 'jpg';
            const filename =
              i === 0 && body.options.downloadMain && !hasMain
                ? `main.${ext}`
                : `gallery_${Date.now()}_${i}.${ext}`;

            const storagePath = `products/${product.id}/${filename}`;

            const { error: uploadErr } = await supabase.storage
              .from('product-images')
              .upload(storagePath, outputBuffer, {
                contentType: body.options.convertToWebp ? 'image/webp' : 'image/jpeg',
                upsert: true,
              });

            if (uploadErr) continue;

            const {
              data: { publicUrl },
            } = supabase.storage.from('product-images').getPublicUrl(storagePath);

            storedUrls.push(publicUrl);
            downloaded++;
          } catch {
            continue;
          }
        }

        if (storedUrls.length > 0) {
          const updateData: Record<string, unknown> = {};

          if (body.options.downloadMain && !hasMain && storedUrls[0]) {
            updateData.main_image_url = storedUrls[0];
          }

          const galleryUrls =
            body.options.downloadMain && !hasMain
              ? storedUrls.slice(1)
              : storedUrls;

          if (galleryUrls.length > 0) {
            updateData.images = [...existingImages, ...galleryUrls];
          }

          if (Object.keys(updateData).length > 0) {
            await supabase.from('products').update(updateData).eq('id', product.id);
          }
        }

        results.push({
          id: product.id,
          name,
          status: downloaded > 0 ? 'success' : 'error',
          imagesFound: productImages.length,
          imagesDownloaded: downloaded,
        });
      } catch (err) {
        results.push({
          id: product.id,
          name,
          status: 'error',
          imagesFound: 0,
          imagesDownloaded: 0,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }

      await delay(2000);
    }

    const stats = {
      total: results.length,
      success: results.filter((r) => r.status === 'success').length,
      skipped: results.filter((r) => r.status === 'skipped').length,
      not_found: results.filter((r) => r.status === 'not_found').length,
      errors: results.filter((r) => r.status === 'error').length,
      totalDownloaded: results.reduce((s, r) => s + r.imagesDownloaded, 0),
    };

    return NextResponse.json({ results, stats });
  } catch (err) {
    console.error('[AI Bulk Fetch Images]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface ParsedImage {
  src: string;
  alt: string;
  isProduct: boolean;
}

async function findProductImages(
  sourceUrls: string[],
  productName: string,
  sku?: string,
): Promise<ParsedImage[]> {
  const searchTerms = sku || productName.split(' ').slice(0, 3).join(' ');

  for (const baseUrl of sourceUrls) {
    const searchUrls = [
      `${baseUrl}/search?q=${encodeURIComponent(searchTerms)}`,
      `${baseUrl}/?s=${encodeURIComponent(searchTerms)}`,
    ];

    for (const searchUrl of searchUrls) {
      try {
        const res = await fetch(searchUrl, FETCH_OPTS);
        if (!res.ok) continue;

        const html = await res.text();
        const $ = cheerio.load(html);

        const productLink = $(
          'a[href*="product"], a[href*="tovar"], .product-card a, .product-item a',
        )
          .first()
          .attr('href');

        if (productLink) {
          const fullUrl = productLink.startsWith('http')
            ? productLink
            : new URL(productLink, baseUrl).href;
          return await parsePageImages(fullUrl);
        }
      } catch {
        continue;
      }
    }
  }

  return [];
}

async function parsePageImages(url: string): Promise<ParsedImage[]> {
  const res = await fetch(url, FETCH_OPTS);
  const html = await res.text();
  const $ = cheerio.load(html);

  const images: ParsedImage[] = [];
  const seenUrls = new Set<string>();
  const origin = new URL(url).origin;

  const selectors = [
    '.product-image img', '.product-gallery img', '.product-photo img',
    '.main-image img', '[itemprop="image"]', '.woocommerce-product-gallery img',
    '.gallery img', '.thumbnails img', '.slick-slide img', '.swiper-slide img',
    '.ty-product-img img', '.cm-image img', '#product_images img',
  ];

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const $img = $(el);
      let src =
        $img.attr('data-src') || $img.attr('data-large') ||
        $img.attr('data-zoom-image') || $img.attr('src') || '';

      if (!src || src.startsWith('data:') || src.endsWith('.svg') ||
          src.includes('placeholder') || src.includes('no-image')) return;

      if (src.startsWith('//')) src = 'https:' + src;
      else if (src.startsWith('/')) src = origin + src;
      else if (!src.startsWith('http')) src = origin + '/' + src;

      if (seenUrls.has(src)) return;
      seenUrls.add(src);

      const w = parseInt($img.attr('width') || '0', 10);
      const h = parseInt($img.attr('height') || '0', 10);

      const isProduct =
        (w === 0 || w >= 200) && (h === 0 || h >= 200) &&
        !src.includes('icon') && !src.includes('logo') &&
        !src.includes('banner') && !src.includes('sprite');

      images.push({ src, alt: $img.attr('alt') || '', isProduct });
    });
  }

  $('a[href*=".jpg"], a[href*=".png"], a[href*=".webp"], a[data-fancybox], a[data-lightbox]').each(
    (_, el) => {
      const href = $(el).attr('href') || '';
      if (!href || seenUrls.has(href) || href.startsWith('data:')) return;
      let fullUrl = href;
      if (fullUrl.startsWith('//')) fullUrl = 'https:' + fullUrl;
      else if (fullUrl.startsWith('/')) fullUrl = origin + fullUrl;
      seenUrls.add(fullUrl);
      images.push({ src: fullUrl, alt: '', isProduct: true });
    },
  );

  images.sort((a, b) => (b.isProduct ? 1 : 0) - (a.isProduct ? 1 : 0));
  return images.slice(0, 20);
}
