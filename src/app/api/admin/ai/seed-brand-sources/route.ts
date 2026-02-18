import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const BRAND_SOURCES: Record<string, { urls: string[]; notes: string; context: string }> = {
  DARK: {
    urls: ['https://darkcosmetics.com.ua'],
    notes: 'Український преміум бренд nail-косметики. Заснований 2019. Виробництво Україна. Спеціалізація: бази, топи, гель-лаки, засоби догляду.',
    context: "DARK — це бренд BY RIOR. Бази DARK відомі стійкістю 4-5 тижнів. Не вигадуй об'єм та кислотність якщо не вказано.",
  },
  Staleks: {
    urls: ['https://staleks.com'],
    notes: 'Виробник професійних манікюрних інструментів. Українська компанія. Серії: Expert, Pro, Smart, Classic.',
    context: 'Для інструментів Staleks завжди вказуй серію (Expert/Pro/Smart), тип сталі якщо відомий, довжину ріжучої частини.',
  },
  'F.O.X': {
    urls: ['https://foxnails.ua'],
    notes: 'Український бренд гель-лаків та покриттів. Широка палітра кольорів.',
    context: 'F.O.X відомий великою палітрою та стійкістю. Гель-лаки мають полімеризацію в LED 30 сек, UV 60 сек.',
  },
  'GA&MA': {
    urls: ['https://gamaprofessional.com'],
    notes: 'Бренд для nail-майстрів. Бази, топи, гель-лаки, засоби догляду.',
    context: '',
  },
  LUNA: {
    urls: ['https://luna-nails.com.ua'],
    notes: 'Український бренд. Відомий камуфлюючими базами та кольоровими покриттями.',
    context: '',
  },
  Siller: {
    urls: ['https://siller.ua'],
    notes: 'Український бренд професійної nail-косметики.',
    context: '',
  },
  WEEX: {
    urls: [],
    notes: 'Бренд гель-лаків. Щільні, насичені, з відмінним блиском.',
    context: '',
  },
};

export async function POST() {
  const supabase = createAdminClient();
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const [name, src] of Object.entries(BRAND_SOURCES)) {
    const { data: brand } = await supabase
      .from('brands')
      .select('id, source_notes')
      .eq('name', name)
      .single();

    if (!brand) {
      skipped++;
      continue;
    }

    if (brand.source_notes) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('brands')
      .update({
        source_urls: src.urls,
        source_notes: src.notes,
        ai_prompt_context: src.context,
      })
      .eq('id', brand.id);

    if (error) {
      errors.push(`${name}: ${error.message}`);
    } else {
      updated++;
    }
  }

  return NextResponse.json({ updated, skipped, errors });
}
