"use client";

import { useState, useCallback } from 'react';
import { ImageIcon, Loader2, Globe, Link as LinkIcon, Package, X } from 'lucide-react';
import { useImageStudioStore } from '@/store/image-studio-store';
import { TemplateSelector } from './TemplateSelector';
import { PromptInput } from './PromptInput';
import type { SelectedImage } from '@/lib/photoroom/types';

/** Витягти URL зображення з HTML (коли перетягуєш <img> з браузера) */
function extractImageUrlFromHtml(html: string): string | null {
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || null;
}

/** Перевірити чи URL схожий на зображення */
function looksLikeImageUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;
  const imageExts = /\.(jpe?g|png|webp|gif|bmp|svg|avif)(\?|#|$)/i;
  if (imageExts.test(url)) return true;
  // Часті CDN патерни для зображень
  if (url.includes('/images/') || url.includes('/img/') || url.includes('/photo/')) return true;
  if (url.includes('cdn') && !url.includes('.html') && !url.includes('.js')) return true;
  return false;
}

export function ImageCanvas() {
  const {
    canvasImage,
    processedImage,
    isProcessing,
    processingLabel,
    selectedTemplate,
    setSelectedTemplate,
    setCanvasImage,
    loadExternalImage,
    customPrompt,
    setCustomPrompt,
    processImage,
    error,
  } = useImageStudioStore();

  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteUrl, setPasteUrl] = useState('');

  // Aspect ratio
  const aspectRatio = selectedTemplate.width / selectedTemplate.height;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      // 1. Внутрішні структуровані дані (з панелі пошуку)
      const jsonData = e.dataTransfer.getData('application/x-studio-image');
      if (jsonData) {
        try {
          const img: SelectedImage = JSON.parse(jsonData);
          setCanvasImage(img);
          return;
        } catch {
          // Fallback
        }
      }

      // 2. HTML — коли перетягуєш картинку з іншого сайту в браузері
      const html = e.dataTransfer.getData('text/html');
      if (html) {
        const imgUrl = extractImageUrlFromHtml(html);
        if (imgUrl && imgUrl.startsWith('http')) {
          // Зовнішнє зображення — проксуємо через сервер
          loadExternalImage(imgUrl);
          return;
        }
      }

      // 3. URL (text/uri-list або text/plain)
      const uriList = e.dataTransfer.getData('text/uri-list');
      const plainUrl = e.dataTransfer.getData('text/plain');
      const url = uriList || plainUrl;

      if (url && url.startsWith('http')) {
        if (looksLikeImageUrl(url)) {
          // Зовнішній URL зображення — проксуємо
          loadExternalImage(url);
        } else {
          // Внутрішній URL (наш домен) — використовуємо напряму
          setCanvasImage({
            id: `drop-${Date.now()}`,
            url,
            source: 'product',
          });
        }
        return;
      }

      // Внутрішній шлях
      if (url && url.startsWith('/')) {
        setCanvasImage({
          id: `drop-${Date.now()}`,
          url,
          source: 'product',
        });
        return;
      }

      // 4. Файл (перетягнутий з файлової системи)
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        const objectUrl = URL.createObjectURL(file);
        setCanvasImage({
          id: `file-${Date.now()}`,
          url: objectUrl,
          source: 'upload',
        });
      }
    },
    [setCanvasImage, loadExternalImage]
  );

  /** Вставити зображення за URL вручну */
  const handlePasteUrl = useCallback(() => {
    const url = pasteUrl.trim();
    if (!url) return;
    if (url.startsWith('http')) {
      loadExternalImage(url);
      setPasteUrl('');
    }
  }, [pasteUrl, loadExternalImage]);

  const handlePromptSubmit = () => {
    if (customPrompt.trim()) {
      processImage('ai-background');
    }
  };

  const displayImage = processedImage || canvasImage?.url;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Template selector */}
      <div
        className="px-4 py-3 border-b"
        style={{ borderColor: 'var(--a-border)' }}
      >
        <TemplateSelector
          selected={selectedTemplate}
          onChange={setSelectedTemplate}
        />
      </div>

      {/* Product info bar */}
      {canvasImage && (canvasImage.productName || canvasImage.productSku) && (
        <div
          className="mx-4 mt-3 flex items-center gap-3 px-3 py-2 rounded-lg"
          style={{
            background: 'rgba(168, 85, 247, 0.06)',
            border: '1px solid rgba(168, 85, 247, 0.12)',
          }}
        >
          <Package className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--a-accent)' }} />
          <div className="flex-1 min-w-0">
            {canvasImage.productName && (
              <p className="text-xs font-medium truncate" style={{ color: 'var(--a-text-body)' }}>
                {canvasImage.productName}
              </p>
            )}
            {canvasImage.productSku && (
              <p
                className="text-[10px] truncate"
                style={{
                  color: 'var(--a-text-3)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.5px',
                }}
              >
                SKU: {canvasImage.productSku}
              </p>
            )}
          </div>
          {canvasImage.url && (
            <img
              src={processedImage || canvasImage.url}
              alt=""
              className="w-8 h-8 rounded object-cover flex-shrink-0"
              style={{ background: 'var(--a-bg-card)' }}
            />
          )}
          <button
            onClick={() => setCanvasImage({ id: '', url: '', source: 'upload' })}
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ color: 'var(--a-text-3)', background: 'var(--a-bg-hover)' }}
            title="Скинути зображення"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <div
          className="relative w-full transition-all rounded-xl overflow-hidden"
          style={{
            maxWidth: '100%',
            aspectRatio: `${aspectRatio}`,
            maxHeight: '100%',
            background: displayImage ? 'var(--a-bg)' : 'rgba(8, 8, 12, 0.5)',
            border: isDragOver
              ? '2px dashed var(--a-accent)'
              : displayImage
                ? '1px solid var(--a-border)'
                : '2px dashed var(--a-border)',
            boxShadow: isDragOver
              ? '0 0 30px rgba(168, 85, 247, 0.15)'
              : 'none',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Порожній стан */}
          {!displayImage && !isProcessing && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8">
              <ImageIcon className="w-12 h-12" style={{ color: 'var(--a-border)' }} />
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: 'var(--a-text-4)' }}>
                  Перетягніть зображення сюди
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--a-text-5)' }}>
                  з іншого сайту, з панелі зліва або з комп&apos;ютера
                </p>
              </div>

              {/* Вставити URL вручну */}
              <div
                className="flex items-center gap-2 w-full max-w-sm"
              >
                <div
                  className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{
                    background: 'var(--a-bg-hover)',
                    border: '1px solid var(--a-border)',
                  }}
                >
                  <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--a-text-4)' }} />
                  <input
                    type="text"
                    value={pasteUrl}
                    onChange={(e) => setPasteUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePasteUrl()}
                    placeholder="Вставте URL зображення..."
                    className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--a-text-5)]"
                    style={{ color: 'var(--a-text-body)' }}
                  />
                </div>
                <button
                  onClick={handlePasteUrl}
                  disabled={!pasteUrl.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                  style={{
                    background: pasteUrl.trim()
                      ? 'rgba(168, 85, 247, 0.15)'
                      : 'var(--a-bg-hover)',
                    border: `1px solid ${pasteUrl.trim() ? 'rgba(168, 85, 247, 0.3)' : 'var(--a-border)'}`,
                    color: pasteUrl.trim() ? 'var(--a-accent)' : 'var(--a-text-4)',
                  }}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Завантажити
                </button>
              </div>

              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(168, 85, 247, 0.08)',
                  border: '1px solid rgba(168, 85, 247, 0.15)',
                }}
              >
                <span
                  className="text-[10px]"
                  style={{
                    color: 'var(--a-text-2)',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '0.5px',
                  }}
                >
                  {selectedTemplate.width}×{selectedTemplate.height}
                </span>
              </div>
            </div>
          )}

          {/* Зображення */}
          {displayImage && !isProcessing && (
            <img
              src={displayImage}
              alt="Canvas"
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10"
              style={{ background: 'rgba(8, 8, 12, 0.85)', backdropFilter: 'blur(8px)' }}
            >
              <div className="relative">
                <Loader2
                  className="w-10 h-10 animate-spin"
                  style={{ color: 'var(--a-accent)' }}
                />
                <div
                  className="absolute inset-0 animate-pulse rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2), transparent)',
                    transform: 'scale(2)',
                  }}
                />
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--a-text-body)' }}>
                {processingLabel || 'PhotoRoom обробляє...'}
              </p>
              {displayImage && (
                <img
                  src={displayImage}
                  alt=""
                  className="absolute inset-0 w-full h-full object-contain opacity-20"
                  draggable={false}
                />
              )}
            </div>
          )}

          {/* Drag overlay */}
          {isDragOver && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-20"
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <Globe className="w-8 h-8" style={{ color: 'var(--a-accent)' }} />
              <p className="text-lg font-semibold" style={{ color: 'var(--a-accent)' }}>
                Відпустіть для завантаження
              </p>
              <p className="text-xs" style={{ color: 'var(--a-text-2)' }}>
                Зображення буде збережено автоматично
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mx-4 mb-2 px-3 py-2 rounded-lg text-xs"
          style={{ background: '#450a0a', color: '#f87171', border: '1px solid #7f1d1d' }}
        >
          {error}
        </div>
      )}

      {/* Prompt input (bottom) */}
      <div className="px-4 pb-4">
        <PromptInput
          value={customPrompt}
          onChange={setCustomPrompt}
          onSubmit={handlePromptSubmit}
          isProcessing={isProcessing}
          disabled={!canvasImage}
        />
      </div>
    </div>
  );
}
