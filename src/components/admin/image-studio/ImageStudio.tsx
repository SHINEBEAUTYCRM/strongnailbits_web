"use client";

// ================================================================
//  StrongNailBits OS — AI Image Studio
//  Головний компонент — fullscreen модалка з трьома панелями
//  Підтримує збереження одного або кількох зображень
// ================================================================

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles } from 'lucide-react';
import { useImageStudioStore } from '@/store/image-studio-store';
import { ProductSearchPanel } from './ProductSearchPanel';
import { ImageCanvas } from './ImageCanvas';
import { AIToolbar } from './AIToolbar';
import type { StudioContext } from '@/lib/photoroom/types';

export interface ImageStudioProps {
  context: StudioContext;
  entityId: string;
  currentImage?: string;
  suggestedSize?: { width: number; height: number };
  /** Зберегти одне зображення (головне) */
  onSave: (imageUrl: string) => Promise<void>;
  /** Зберегти кілька зображень (масова обробка) */
  onBatchSave?: (imageUrls: string[]) => Promise<void>;
  trigger?: React.ReactNode;
}

export function ImageStudio({
  context,
  entityId,
  currentImage,
  suggestedSize,
  onSave,
  onBatchSave,
  trigger,
}: ImageStudioProps) {
  const { isOpen, open, close, saveResult, setCanvasImage, getAllResultUrls } =
    useImageStudioStore();
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleOpen = useCallback(() => {
    open(context, entityId, suggestedSize);

    // Якщо є поточне зображення — встановити на canvas
    if (currentImage) {
      setTimeout(() => {
        setCanvasImage({
          id: `current-${Date.now()}`,
          url: currentImage,
          source: 'upload',
        });
      }, 50);
    }
  }, [context, entityId, suggestedSize, currentImage, open, setCanvasImage]);

  const handleClose = useCallback(() => {
    close();
  }, [close]);

  /** Зберегти одне оброблене зображення (кнопка "Зберегти") */
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const url = await saveResult();
      await onSave(url);
      close();
    } catch (err) {
      console.error('[ImageStudio] Save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [saveResult, onSave, close]);

  /** Зберегти всі оброблені зображення (кнопка "Зберегти всі") */
  const handleBatchSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const urls = getAllResultUrls();
      if (urls.length === 0) {
        console.warn('[ImageStudio] No batch results to save');
        return;
      }

      if (onBatchSave) {
        // Якщо є спеціальний callback — використовуємо його
        await onBatchSave(urls);
      } else {
        // Fallback: зберігаємо тільки перше зображення через onSave
        await onSave(urls[0]);
      }
      close();
    } catch (err) {
      console.error('[ImageStudio] Batch save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [getAllResultUrls, onBatchSave, onSave, close]);

  // Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const modal = isOpen && mounted
    ? createPortal(
        <div
          className="fixed inset-0 flex items-stretch"
          style={{
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Header bar */}
          <div
            className="absolute top-0 left-0 right-0 h-12 flex items-center justify-between px-4"
            style={{
              zIndex: 10,
              background: 'var(--a-bg)',
              borderBottom: '1px solid var(--a-border)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-3 py-1 rounded-full"
                style={{
                  background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15))',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'var(--a-accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--a-text-body)' }}>
                  AI Image Studio
                </span>
              </div>
              <span
                className="text-[10px] uppercase"
                style={{
                  color: 'var(--a-text-4)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '1px',
                }}
              >
                {context} · {entityId.slice(0, 8)}
              </span>
            </div>

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                color: 'var(--a-text-3)',
                background: 'var(--a-bg-hover)',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main content — three panels */}
          <div className="flex w-full pt-12">
            {/* Left: Product Search */}
            <ProductSearchPanel />

            {/* Center: Canvas */}
            <ImageCanvas />

            {/* Right: AI Toolbar */}
            <AIToolbar
              onSave={handleSave}
              onBatchSave={handleBatchSave}
              isSaving={isSaving}
            />
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      {!trigger ? (
        <button
          onClick={handleOpen}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15))',
            border: '1px solid rgba(168, 85, 247, 0.2)',
            color: 'var(--a-accent)',
          }}
        >
          <Sparkles className="w-4 h-4" />
          Створити з AI
        </button>
      ) : (
        <span onClick={handleOpen} className="cursor-pointer">
          {trigger}
        </span>
      )}

      {modal}
    </>
  );
}
