// ================================================================
//  ShineShop OS — PhotoRoom API Types
//  Типи для AI Image Studio
// ================================================================

/** Доступні дії PhotoRoom API */
export type PhotoRoomAction =
  | 'remove-bg'
  | 'ai-background'
  | 'shadow'
  | 'relight'
  | 'upscale'
  | 'text-remove';

/** Опції для редагування зображення через PhotoRoom */
export interface EditOptions {
  imageUrl?: string;
  imageFile?: File;
  removeBackground?: boolean;
  backgroundPrompt?: string;
  backgroundPromptExpansion?: 'ai.auto' | 'never';
  backgroundColorHex?: string;
  shadowMode?: 'ai.soft' | 'ai.hard' | 'ai.floating';
  lightingMode?: 'ai.auto' | 'ai.preserve-hue-and-saturation';
  upscale?: 'ai.fast' | 'ai.slow';
  textRemovalMode?: 'ai.artificial';
  padding?: number;
  margin?: number;
  outputWidth?: number;
  outputHeight?: number;
}

/** Результат обробки одного зображення */
export interface EditResult {
  url: string;
  fileName: string;
}

/** Результат пакетної обробки */
export interface BatchResult {
  status: 'fulfilled' | 'rejected';
  value?: EditResult;
  reason?: string;
}

/** Пресет фону */
export interface BackgroundPreset {
  id: string;
  name: string;
  prompt: string;
  thumbnail: string; // emoji або CSS gradient для прев'ю
  color?: string;
}

/** Пресет розміру */
export interface TemplateSize {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
}

/** Зображення товару з Supabase */
export interface ProductImage {
  id: string;
  name: string;
  sku: string;
  brand: string;
  main_image: string;
  additional_images: string[];
}

/** Обране зображення для канвасу */
export interface SelectedImage {
  id: string;
  url: string;
  productName?: string;
  productSku?: string;
  source: 'product' | 'upload' | 'processed';
}

/** Запис в історії дій */
export interface HistoryEntry {
  id: string;
  action: PhotoRoomAction;
  label: string;
  imageUrl: string;
  timestamp: number;
}

/** Елемент черги пакетної обробки */
export interface BatchQueueItem {
  id: string;
  sourceImage: SelectedImage;
  resultUrl?: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

/** Контекст використання Image Studio */
export type StudioContext = 'category' | 'product' | 'banner' | 'landing' | 'brand-logo' | 'brand-banner';

/** Помилка PhotoRoom API */
export interface PhotoRoomError {
  code: string;
  message: string;
  status: number;
}
