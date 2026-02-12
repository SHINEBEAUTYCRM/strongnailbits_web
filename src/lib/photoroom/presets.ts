// ================================================================
//  ShineShop OS — PhotoRoom Presets
//  Готові пресети фонів та розмірів для nail-індустрії
// ================================================================

import type { BackgroundPreset, TemplateSize } from './types';

/** Пресети AI-фонів для nail-індустрії */
export const backgroundPresets: BackgroundPreset[] = [
  {
    id: 'white-marble',
    name: 'Білий мармур',
    prompt: 'white marble surface with subtle grey veins, soft natural shadows, luxury beauty product photography, clean minimalist',
    thumbnail: '🤍',
    color: '#f5f5f5',
  },
  {
    id: 'holographic',
    name: 'Голографік',
    prompt: 'iridescent holographic background, rainbow reflections, prismatic light effects, futuristic beauty aesthetic',
    thumbnail: '🌈',
    color: '#c084fc',
  },
  {
    id: 'dark-luxury',
    name: 'Dark Luxury',
    prompt: 'dark moody background, dramatic side lighting, deep shadows, luxury premium feel, black velvet texture',
    thumbnail: '🖤',
    color: '#18181b',
  },
  {
    id: 'flowers',
    name: 'Квіти',
    prompt: 'scattered pink and white flower petals, romantic beauty atmosphere, soft pastel lighting, delicate floral arrangement',
    thumbnail: '🌸',
    color: '#fbcfe8',
  },
  {
    id: 'cloud-dancer',
    name: 'Cloud Dancer 2026',
    prompt: 'warm off-white background #F0EDE8, Cloud Dancer Pantone color of the year 2026, soft warm tones, elegant minimalist',
    thumbnail: '☁️',
    color: '#F0EDE8',
  },
  {
    id: 'neon-glow',
    name: 'Neon Glow',
    prompt: 'purple and pink neon gradient glow, cyberpunk atmosphere, vibrant fluorescent lighting, futuristic beauty',
    thumbnail: '💜',
    color: '#a855f7',
  },
  {
    id: 'nature',
    name: 'Природа',
    prompt: 'fresh green leaves and water drops, organic natural background, morning dew, eco beauty, botanical setting',
    thumbnail: '🌿',
    color: '#22c55e',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    prompt: 'warm golden sunlight, soft bokeh background, sunset warm tones, dreamy golden hour photography lighting',
    thumbnail: '🌅',
    color: '#f59e0b',
  },
];

/** Пресети розмірів для різних контекстів */
export const templateSizes: TemplateSize[] = [
  {
    id: 'category-hero',
    name: 'Категорія',
    width: 1200,
    height: 400,
    description: 'Обкладинка категорії',
  },
  {
    id: 'product-main',
    name: 'Товар',
    width: 1000,
    height: 1000,
    description: 'Фото товару',
  },
  {
    id: 'banner-full',
    name: 'Банер',
    width: 1920,
    height: 600,
    description: 'Банер (повна ширина)',
  },
  {
    id: 'banner-half',
    name: 'Банер ½',
    width: 960,
    height: 400,
    description: 'Банер (половина)',
  },
  {
    id: 'story',
    name: 'Stories',
    width: 1080,
    height: 1920,
    description: 'Stories / Reels',
  },
  {
    id: 'social-square',
    name: 'Пост',
    width: 1080,
    height: 1080,
    description: 'Пост (квадрат)',
  },
  {
    id: 'thumbnail',
    name: 'Міні',
    width: 400,
    height: 400,
    description: 'Мініатюра',
  },
];

/** Отримати пресет розміру за ID */
export function getTemplateById(id: string): TemplateSize | undefined {
  return templateSizes.find((t) => t.id === id);
}

/** Отримати рекомендований пресет для контексту */
export function getSuggestedTemplate(
  context: 'category' | 'product' | 'banner' | 'landing'
): TemplateSize {
  const map: Record<string, string> = {
    category: 'category-hero',
    product: 'product-main',
    banner: 'banner-full',
    landing: 'banner-full',
  };
  return getTemplateById(map[context]) ?? templateSizes[1];
}
