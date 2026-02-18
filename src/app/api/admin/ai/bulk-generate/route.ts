import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callClaude } from '@/lib/ai/claude';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildSeoPrompt,
  type GenerateRequest,
} from '@/lib/ai/description-prompts';

interface BulkRequest {
  productIds: string[];
  action: 'generate' | 'translate' | 'seo';
  targetLang: 'uk' | 'ru';
  autoSave: boolean;
}

interface BulkResultItem {
  id: string;
  name: string;
  status: 'success' | 'skipped' | 'error';
  html?: string;
  meta_title?: string;
  meta_description?: string;
  error?: string;
  tokens?: number;
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function POST(request: NextRequest) {
  try {
    const body: BulkRequest = await request.json();

    if (!body.productIds?.length || !body.action || !body.targetLang) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (body.productIds.length > 50) {
      return NextResponse.json(
        { error: 'Max 50 products per batch' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: products, error: fetchErr } = await supabase
      .from('products')
      .select('id, name_uk, name_ru, description_uk, description_ru, price, meta_title, meta_description, brand_id, category_id, brands(name), categories(name_uk)')
      .in('id', body.productIds);

    if (fetchErr || !products) {
      return NextResponse.json(
        { error: 'Failed to fetch products' },
        { status: 500 }
      );
    }

    const results: BulkResultItem[] = [];
    let totalTokens = 0;

    for (const product of products) {
      const brandName = (product.brands as { name?: string } | null)?.name;
      const categoryName = (product.categories as { name_uk?: string } | null)?.name_uk;
      const name = body.targetLang === 'uk'
        ? (product.name_uk || product.name_ru)
        : (product.name_ru || product.name_uk);

      if (body.action === 'seo') {
        if (product.meta_title && product.meta_description) {
          results.push({ id: product.id, name, status: 'skipped' });
          continue;
        }

        const { system, user } = buildSeoPrompt({
          productName: name,
          brand: brandName,
          category: categoryName,
          description: product.description_uk || product.description_ru || '',
          targetLang: body.targetLang,
        });

        const result = await callClaude({
          system,
          messages: [{ role: 'user', content: user }],
          maxTokens: 500,
          fast: true,
        });

        if (!result.success) {
          results.push({ id: product.id, name, status: 'error', error: result.error });
          await delay(500);
          continue;
        }

        try {
          const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          const tokens = (result.inputTokens || 0) + (result.outputTokens || 0);
          totalTokens += tokens;

          if (body.autoSave) {
            await supabase
              .from('products')
              .update({
                meta_title: parsed.meta_title,
                meta_description: parsed.meta_description,
              })
              .eq('id', product.id);
          }

          results.push({
            id: product.id,
            name,
            status: 'success',
            meta_title: parsed.meta_title,
            meta_description: parsed.meta_description,
            tokens,
          });
        } catch {
          results.push({ id: product.id, name, status: 'error', error: 'JSON parse failed' });
        }

        await delay(500);
        continue;
      }

      // Description generation / translation
      const descField = body.targetLang === 'uk' ? 'description_uk' : 'description_ru';
      const otherDescField = body.targetLang === 'uk' ? 'description_ru' : 'description_uk';
      const currentDesc = product[descField] as string | null;
      const otherDesc = product[otherDescField] as string | null;

      if (body.action === 'generate' && currentDesc) {
        results.push({ id: product.id, name, status: 'skipped' });
        continue;
      }

      if (body.action === 'translate' && !otherDesc) {
        results.push({ id: product.id, name, status: 'skipped', error: 'No source description' });
        continue;
      }

      const genReq: GenerateRequest = {
        action: body.action,
        targetLang: body.targetLang,
        productName: name,
        brand: brandName,
        category: categoryName,
        price: product.price ? Number(product.price) : undefined,
        existingDescription: body.action === 'translate' ? (otherDesc || '') : (currentDesc || ''),
        otherLangDescription: body.action === 'generate' ? (otherDesc || '') : undefined,
      };

      const systemPrompt = buildSystemPrompt(genReq);
      const userPrompt = buildUserPrompt(genReq);

      const result = await callClaude({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        maxTokens: 2000,
      });

      if (!result.success) {
        results.push({ id: product.id, name, status: 'error', error: result.error });
        await delay(1000);
        continue;
      }

      const tokens = (result.inputTokens || 0) + (result.outputTokens || 0);
      totalTokens += tokens;

      if (body.autoSave) {
        await supabase
          .from('products')
          .update({ [descField]: result.text })
          .eq('id', product.id);
      }

      results.push({
        id: product.id,
        name,
        status: 'success',
        html: result.text,
        tokens,
      });

      await delay(1000);
    }

    const stats = {
      total: results.length,
      success: results.filter(r => r.status === 'success').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
      totalTokens,
    };

    return NextResponse.json({ results, stats });
  } catch (err) {
    console.error('[AI Bulk Generate]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
