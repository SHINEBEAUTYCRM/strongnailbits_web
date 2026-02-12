"use client";

// ================================================================
//  ShineShop OS — Image Studio Zustand Store
//  Стейт-менеджмент для AI Image Studio
// ================================================================

import { create } from 'zustand';
import { editImage } from '@/lib/photoroom/client';
import { templateSizes, getSuggestedTemplate } from '@/lib/photoroom/presets';
import type {
  PhotoRoomAction,
  EditOptions,
  SelectedImage,
  ProductImage,
  TemplateSize,
  HistoryEntry,
  StudioContext,
} from '@/lib/photoroom/types';

interface ImageStudioState {
  isOpen: boolean;
  context: StudioContext;
  entityId: string | null;

  // Пошук товарів
  searchQuery: string;
  searchResults: ProductImage[];
  isSearching: boolean;

  // Обрані зображення (з товарів)
  selectedImages: SelectedImage[];

  // Canvas
  canvasImage: SelectedImage | null;
  processedImage: string | null;
  isProcessing: boolean;
  processingLabel: string;

  // AI налаштування
  activeAction: PhotoRoomAction | null;
  customPrompt: string;
  selectedTemplate: TemplateSize;
  selectedBackground: string | null;

  // Історія дій (undo)
  history: HistoryEntry[];

  // Error state
  error: string | null;

  // Actions
  open: (context: StudioContext, entityId: string, suggestedSize?: { width: number; height: number }) => void;
  close: () => void;
  setSearchQuery: (q: string) => void;
  setSearchResults: (results: ProductImage[]) => void;
  setIsSearching: (v: boolean) => void;
  addSelectedImage: (img: SelectedImage) => void;
  removeSelectedImage: (id: string) => void;
  setCanvasImage: (img: SelectedImage) => void;
  setSelectedTemplate: (template: TemplateSize) => void;
  setSelectedBackground: (id: string | null) => void;
  setCustomPrompt: (prompt: string) => void;
  setActiveAction: (action: PhotoRoomAction | null) => void;
  setError: (error: string | null) => void;
  processImage: (action: PhotoRoomAction, options?: EditOptions) => Promise<void>;
  undo: () => void;
  saveResult: () => Promise<string>;
}

export const useImageStudioStore = create<ImageStudioState>()((set, get) => ({
  isOpen: false,
  context: 'product',
  entityId: null,

  searchQuery: '',
  searchResults: [],
  isSearching: false,

  selectedImages: [],

  canvasImage: null,
  processedImage: null,
  isProcessing: false,
  processingLabel: '',

  activeAction: null,
  customPrompt: '',
  selectedTemplate: templateSizes[1], // product-main за замовчуванням
  selectedBackground: null,

  history: [],

  error: null,

  open: (context, entityId, suggestedSize) => {
    let template = getSuggestedTemplate(context);

    // Якщо передано кастомний розмір — шукаємо відповідний пресет або створюємо
    if (suggestedSize) {
      const found = templateSizes.find(
        (t) => t.width === suggestedSize.width && t.height === suggestedSize.height
      );
      if (found) {
        template = found;
      }
    }

    set({
      isOpen: true,
      context,
      entityId,
      selectedTemplate: template,
      // Скинути стан
      searchQuery: '',
      searchResults: [],
      selectedImages: [],
      canvasImage: null,
      processedImage: null,
      isProcessing: false,
      processingLabel: '',
      activeAction: null,
      customPrompt: '',
      selectedBackground: null,
      history: [],
      error: null,
    });
  },

  close: () => {
    set({ isOpen: false });
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (v) => set({ isSearching: v }),

  addSelectedImage: (img) => {
    const { selectedImages } = get();
    if (selectedImages.find((i) => i.id === img.id)) return;
    set({ selectedImages: [...selectedImages, img] });
  },

  removeSelectedImage: (id) => {
    set((state) => ({
      selectedImages: state.selectedImages.filter((i) => i.id !== id),
    }));
  },

  setCanvasImage: (img) => {
    set({ canvasImage: img, processedImage: null, error: null });
  },

  setSelectedTemplate: (template) => set({ selectedTemplate: template }),
  setSelectedBackground: (id) => set({ selectedBackground: id }),
  setCustomPrompt: (prompt) => set({ customPrompt: prompt }),
  setActiveAction: (action) => set({ activeAction: action }),
  setError: (error) => set({ error }),

  processImage: async (action, options) => {
    const state = get();
    const imageSource = state.processedImage || state.canvasImage?.url;

    if (!imageSource) {
      set({ error: 'Спочатку виберіть зображення' });
      return;
    }

    const actionLabels: Record<PhotoRoomAction, string> = {
      'remove-bg': 'Видалення фону',
      'ai-background': 'Генерація AI фону',
      'shadow': 'Додавання тіней',
      'relight': 'AI переосвітлення',
      'upscale': 'Збільшення якості',
      'text-remove': 'Видалення тексту',
    };

    set({
      isProcessing: true,
      processingLabel: actionLabels[action] || 'Обробка',
      error: null,
      activeAction: action,
    });

    try {
      // Формуємо опції залежно від дії
      const editOptions: EditOptions = {
        imageUrl: imageSource,
        outputWidth: state.selectedTemplate.width,
        outputHeight: state.selectedTemplate.height,
        ...options,
      };

      // Базові налаштування залежно від дії
      switch (action) {
        case 'remove-bg':
          editOptions.removeBackground = true;
          break;
        case 'ai-background':
          editOptions.removeBackground = true;
          if (state.customPrompt) {
            editOptions.backgroundPrompt = state.customPrompt;
            editOptions.backgroundPromptExpansion = 'ai.auto';
          }
          break;
        case 'shadow':
          editOptions.shadowMode = (options?.shadowMode) || 'ai.soft';
          break;
        case 'relight':
          editOptions.lightingMode = (options?.lightingMode) || 'ai.auto';
          break;
        case 'upscale':
          editOptions.upscale = (options?.upscale) || 'ai.fast';
          break;
        case 'text-remove':
          editOptions.textRemovalMode = 'ai.artificial';
          break;
      }

      const result = await editImage(editOptions);

      // Зберегти в історію
      const historyEntry: HistoryEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        action,
        label: actionLabels[action],
        imageUrl: result.url,
        timestamp: Date.now(),
      };

      set((s) => ({
        processedImage: result.url,
        isProcessing: false,
        processingLabel: '',
        history: [historyEntry, ...s.history],
      }));
    } catch (err) {
      set({
        isProcessing: false,
        processingLabel: '',
        error: err instanceof Error ? err.message : 'Помилка обробки зображення',
      });
    }
  },

  undo: () => {
    const { history } = get();
    if (history.length <= 1) {
      // Повернутися до оригіналу
      set({ processedImage: null, history: [] });
      return;
    }

    // Видалити останній запис, показати попередній
    const newHistory = history.slice(1);
    set({
      processedImage: newHistory[0]?.imageUrl || null,
      history: newHistory,
    });
  },

  saveResult: async () => {
    const { processedImage, canvasImage } = get();
    const finalUrl = processedImage || canvasImage?.url;

    if (!finalUrl) {
      throw new Error('Немає зображення для збереження');
    }

    return finalUrl;
  },
}));
