"use client";

import { useState, useCallback } from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { useImageStudioStore } from '@/store/image-studio-store';
import { TemplateSelector } from './TemplateSelector';
import { PromptInput } from './PromptInput';
import type { SelectedImage } from '@/lib/photoroom/types';

export function ImageCanvas() {
  const {
    canvasImage,
    processedImage,
    isProcessing,
    processingLabel,
    selectedTemplate,
    setSelectedTemplate,
    setCanvasImage,
    customPrompt,
    setCustomPrompt,
    processImage,
    error,
  } = useImageStudioStore();

  const [isDragOver, setIsDragOver] = useState(false);

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

      // Спробувати отримати структуровані дані
      const jsonData = e.dataTransfer.getData('application/x-studio-image');
      if (jsonData) {
        try {
          const img: SelectedImage = JSON.parse(jsonData);
          setCanvasImage(img);
          return;
        } catch {
          // Fallback до URL
        }
      }

      // Fallback — URL
      const url = e.dataTransfer.getData('text/plain');
      if (url && (url.startsWith('http') || url.startsWith('/'))) {
        setCanvasImage({
          id: `drop-${Date.now()}`,
          url,
          source: 'product',
        });
        return;
      }

      // Fallback — файл
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
    [setCanvasImage]
  );

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
        style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}
      >
        <TemplateSelector
          selected={selectedTemplate}
          onChange={setSelectedTemplate}
        />
      </div>

      {/* Canvas area */}
      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <div
          className="relative w-full transition-all rounded-xl overflow-hidden"
          style={{
            maxWidth: '100%',
            aspectRatio: `${aspectRatio}`,
            maxHeight: '100%',
            background: displayImage ? '#0a0a10' : 'rgba(8, 8, 12, 0.5)',
            border: isDragOver
              ? '2px dashed #a855f7'
              : displayImage
                ? '1px solid rgba(255, 255, 255, 0.06)'
                : '2px dashed rgba(255, 255, 255, 0.08)',
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <ImageIcon className="w-12 h-12" style={{ color: '#1e1e2a' }} />
              <div className="text-center">
                <p className="text-sm font-medium" style={{ color: '#4b5563' }}>
                  Перетягніть зображення сюди
                </p>
                <p className="text-xs mt-1" style={{ color: '#374151' }}>
                  або оберіть товар зліва
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full mt-2"
                style={{
                  background: 'rgba(168, 85, 247, 0.08)',
                  border: '1px solid rgba(168, 85, 247, 0.15)',
                }}
              >
                <span
                  className="text-[10px]"
                  style={{
                    color: '#9ca3af',
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
                  style={{ color: '#a855f7' }}
                />
                <div
                  className="absolute inset-0 animate-pulse rounded-full"
                  style={{
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.2), transparent)',
                    transform: 'scale(2)',
                  }}
                />
              </div>
              <p className="text-sm font-medium" style={{ color: '#e5e7eb' }}>
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
              className="absolute inset-0 flex items-center justify-center z-20"
              style={{
                background: 'rgba(168, 85, 247, 0.1)',
                backdropFilter: 'blur(4px)',
              }}
            >
              <p className="text-lg font-semibold" style={{ color: '#c084fc' }}>
                Відпустіть для розміщення
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
