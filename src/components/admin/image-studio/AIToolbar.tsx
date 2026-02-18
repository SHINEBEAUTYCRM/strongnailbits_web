"use client";

import {
  Loader2, Save, Scissors, Paintbrush, Eclipse,
  Sun, ZoomIn, TypeOutline, Layers, CheckCircle2,
  AlertCircle, X, Download,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useImageStudioStore } from '@/store/image-studio-store';
import { BackgroundPicker } from './BackgroundPicker';
import { ImageHistory } from './ImageHistory';
import type { PhotoRoomAction } from '@/lib/photoroom/types';

interface AIToolbarProps {
  onSave: () => void;
  onBatchSave: () => void;
  isSaving: boolean;
}

const AI_TOOLS: { action: PhotoRoomAction; icon: LucideIcon; label: string; color: string }[] = [
  { action: 'remove-bg', icon: Scissors, label: 'Видалити фон', color: '#f87171' },
  { action: 'ai-background', icon: Paintbrush, label: 'AI фон', color: 'var(--a-accent)' },
  { action: 'shadow', icon: Eclipse, label: 'Тіні', color: 'var(--a-text-3)' },
  { action: 'relight', icon: Sun, label: 'Освітлення', color: '#facc15' },
  { action: 'upscale', icon: ZoomIn, label: 'Збільшити', color: '#06b6d4' },
  { action: 'text-remove', icon: TypeOutline, label: 'Прибрати текст', color: '#f97316' },
];

export function AIToolbar({ onSave, onBatchSave, isSaving }: AIToolbarProps) {
  const {
    canvasImage,
    processedImage,
    isProcessing,
    activeAction,
    processImage,
    processBatch,
    selectedBackground,
    setSelectedBackground,
    setCustomPrompt,
    customPrompt,
    history,
    undo,
    selectedImages,
    batchResults,
    isBatchProcessing,
    batchProgress,
    clearBatchResults,
    removeBatchResult,
  } = useImageStudioStore();

  const hasImage = !!(canvasImage || processedImage);
  const hasResult = !!processedImage;
  const hasMultipleImages = selectedImages.length > 1;
  const hasBatchResults = batchResults.filter((r) => r.status === 'done').length > 0;
  const batchDoneCount = batchResults.filter((r) => r.status === 'done').length;

  const handleToolClick = (action: PhotoRoomAction) => {
    if (!hasImage || isProcessing) return;
    processImage(action);
  };

  const handleBatchClick = (action: PhotoRoomAction) => {
    if (selectedImages.length === 0 || isProcessing || isBatchProcessing) return;
    processBatch(action);
  };

  const handleBackgroundApply = (prompt: string) => {
    setCustomPrompt(prompt);
    if (hasImage && !isProcessing) {
      processImage('ai-background', { backgroundPrompt: prompt });
    }
  };

  const handleBatchBackgroundApply = (prompt: string) => {
    setCustomPrompt(prompt);
    if (selectedImages.length > 0 && !isProcessing && !isBatchProcessing) {
      processBatch('ai-background', { backgroundPrompt: prompt });
    }
  };

  const handleHistorySelect = (entry: { imageUrl: string }) => {
    const store = useImageStudioStore.getState();
    store.setCanvasImage({
      id: `history-${Date.now()}`,
      url: entry.imageUrl,
      source: 'processed',
    });
  };

  return (
    <div
      className="w-[280px] flex flex-col h-full"
      style={{
        background: 'var(--a-bg)',
        borderLeft: '1px solid var(--a-border)',
      }}
    >
      {/* AI Tools */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--a-border)' }}>
        <p
          className="text-[10px] font-semibold uppercase mb-2.5"
          style={{
            color: 'var(--a-text-3)',
            letterSpacing: '1.5px',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          AI інструменти
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {AI_TOOLS.map((tool) => {
            const isActive = activeAction === tool.action && isProcessing;
            const disabled = !hasImage || isProcessing || isBatchProcessing;
            const Icon = tool.icon;

            return (
              <button
                key={tool.action}
                onClick={() => handleToolClick(tool.action)}
                disabled={disabled}
                className="flex items-center gap-2 px-2.5 py-2.5 rounded-lg transition-all text-left"
                style={{
                  background: isActive
                    ? 'rgba(168, 85, 247, 0.15)'
                    : disabled
                      ? 'var(--a-bg-hover)'
                      : 'var(--a-bg-hover)',
                  border: `1px solid ${
                    isActive
                      ? 'rgba(168, 85, 247, 0.3)'
                      : 'var(--a-border)'
                  }`,
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: 'var(--a-accent)' }} />
                ) : (
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: disabled ? 'var(--a-text-5)' : tool.color }} />
                )}
                <span className="text-[10px]" style={{ color: disabled ? 'var(--a-text-5)' : 'var(--a-text-body)' }}>
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Batch processing button */}
        {hasMultipleImages && (
          <div className="mt-2.5 space-y-1.5">
            <div
              className="w-full h-px"
              style={{ background: 'var(--a-bg-hover)' }}
            />
            <p
              className="text-[10px] font-semibold uppercase mt-2"
              style={{
                color: 'var(--a-text-3)',
                letterSpacing: '1.5px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Масова обробка ({selectedImages.length} фото)
            </p>

            <div className="grid grid-cols-2 gap-1.5">
              {AI_TOOLS.slice(0, 4).map((tool) => {
                const disabled = isProcessing || isBatchProcessing;
                const Icon = tool.icon;

                return (
                  <button
                    key={`batch-${tool.action}`}
                    onClick={() => handleBatchClick(tool.action)}
                    disabled={disabled}
                    className="flex items-center gap-1.5 px-2 py-2 rounded-lg transition-all text-left"
                    style={{
                      background: 'rgba(168, 85, 247, 0.06)',
                      border: '1px solid rgba(168, 85, 247, 0.12)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      opacity: disabled ? 0.5 : 1,
                    }}
                  >
                    <Layers className="w-3 h-3 flex-shrink-0" style={{ color: tool.color }} />
                    <span className="text-[9px]" style={{ color: 'var(--a-accent)' }}>
                      {tool.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Batch progress */}
        {isBatchProcessing && (
          <div className="mt-2.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--a-accent)' }} />
              <span className="text-[10px]" style={{ color: 'var(--a-accent)' }}>
                Обробка {batchProgress.done}/{batchProgress.total}
              </span>
            </div>
            <div
              className="w-full h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--a-bg-hover)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${batchProgress.total > 0 ? (batchProgress.done / batchProgress.total) * 100 : 0}%`,
                  background: 'linear-gradient(135deg, var(--a-accent), #ec4899)',
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Batch Results */}
      {batchResults.length > 0 && (
        <div
          className="p-3 border-b"
          style={{ borderColor: 'var(--a-border)' }}
        >
          <div className="flex items-center justify-between mb-2">
            <p
              className="text-[10px] font-semibold uppercase"
              style={{
                color: 'var(--a-text-3)',
                letterSpacing: '1.5px',
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              Результати ({batchDoneCount}/{batchResults.length})
            </p>
            {!isBatchProcessing && (
              <button
                onClick={clearBatchResults}
                className="text-[9px] px-1.5 py-0.5 rounded transition-colors"
                style={{ color: 'var(--a-text-3)', background: 'var(--a-bg-hover)' }}
              >
                Очистити
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto">
            {batchResults.map((item) => (
              <div key={item.id} className="relative group">
                {item.status === 'done' && item.resultUrl ? (
                  <img
                    src={item.resultUrl}
                    alt=""
                    className="w-full aspect-square rounded-lg object-cover"
                    style={{ background: 'var(--a-bg-card)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                  />
                ) : item.status === 'processing' ? (
                  <div
                    className="w-full aspect-square rounded-lg flex items-center justify-center"
                    style={{ background: 'var(--a-bg-card)', border: '1px solid rgba(168, 85, 247, 0.2)' }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--a-accent)' }} />
                  </div>
                ) : item.status === 'error' ? (
                  <div
                    className="w-full aspect-square rounded-lg flex flex-col items-center justify-center gap-1"
                    style={{ background: 'var(--a-bg-card)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                    title={item.error}
                  >
                    <AlertCircle className="w-4 h-4" style={{ color: '#f87171' }} />
                    <span className="text-[8px] text-center px-1" style={{ color: '#f87171' }}>
                      Помилка
                    </span>
                  </div>
                ) : (
                  <div
                    className="w-full aspect-square rounded-lg"
                    style={{ background: 'var(--a-bg-card)', border: '1px solid var(--a-border)' }}
                  >
                    <img
                      src={item.sourceImage.url}
                      alt=""
                      className="w-full h-full rounded-lg object-cover opacity-30"
                    />
                  </div>
                )}

                {/* Status badge */}
                {item.status === 'done' && (
                  <div className="absolute top-0.5 right-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                  </div>
                )}

                {/* Remove button */}
                {item.status === 'done' && (
                  <button
                    onClick={() => removeBatchResult(item.id)}
                    className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'rgba(239, 68, 68, 0.9)' }}
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Background presets */}
      <div
        className="p-3 border-b flex-shrink-0"
        style={{ borderColor: 'var(--a-border)' }}
      >
        <BackgroundPicker
          selected={selectedBackground}
          onSelect={setSelectedBackground}
          onApply={hasMultipleImages ? handleBatchBackgroundApply : handleBackgroundApply}
        />
      </div>

      {/* History */}
      <div className="flex-1 overflow-y-auto p-3">
        <ImageHistory
          history={history}
          onUndo={undo}
          onSelectEntry={handleHistorySelect}
        />
      </div>

      {/* Save buttons (sticky bottom) */}
      <div
        className="p-3 border-t space-y-2"
        style={{ borderColor: 'var(--a-border)' }}
      >
        {/* Batch save */}
        {hasBatchResults && (
          <button
            onClick={onBatchSave}
            disabled={isProcessing || isBatchProcessing || isSaving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all"
            style={{
              background:
                isProcessing || isBatchProcessing || isSaving
                  ? 'var(--a-bg-hover)'
                  : 'linear-gradient(135deg, #22c55e, #06b6d4)',
              color:
                isProcessing || isBatchProcessing || isSaving
                  ? 'var(--a-text-3)'
                  : '#ffffff',
              cursor:
                isProcessing || isBatchProcessing || isSaving
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Зберегти всі ({batchDoneCount} фото)
          </button>
        )}

        {/* Single save */}
        <button
          onClick={onSave}
          disabled={!hasResult || isProcessing || isBatchProcessing || isSaving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background:
              !hasResult || isProcessing || isBatchProcessing || isSaving
                ? 'var(--a-bg-hover)'
                : 'linear-gradient(135deg, var(--a-accent), #ec4899)',
            color:
              !hasResult || isProcessing || isBatchProcessing || isSaving
                ? 'var(--a-text-3)'
                : '#ffffff',
            cursor:
              !hasResult || isProcessing || isBatchProcessing || isSaving
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Зберегти
        </button>
      </div>
    </div>
  );
}
