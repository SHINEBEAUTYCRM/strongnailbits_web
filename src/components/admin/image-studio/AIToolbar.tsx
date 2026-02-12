"use client";

import { Loader2, Save } from 'lucide-react';
import { useImageStudioStore } from '@/store/image-studio-store';
import { BackgroundPicker } from './BackgroundPicker';
import { ImageHistory } from './ImageHistory';
import type { PhotoRoomAction } from '@/lib/photoroom/types';

interface AIToolbarProps {
  onSave: () => void;
  isSaving: boolean;
}

const AI_TOOLS: { action: PhotoRoomAction; emoji: string; label: string }[] = [
  { action: 'remove-bg', emoji: '✂️', label: 'Видалити фон' },
  { action: 'ai-background', emoji: '🎨', label: 'AI фон' },
  { action: 'shadow', emoji: '🌑', label: 'Тіні' },
  { action: 'relight', emoji: '💡', label: 'Освітлення' },
  { action: 'upscale', emoji: '🔍', label: 'Збільшити' },
  { action: 'text-remove', emoji: '🚫', label: 'Прибрати текст' },
];

export function AIToolbar({ onSave, isSaving }: AIToolbarProps) {
  const {
    canvasImage,
    processedImage,
    isProcessing,
    activeAction,
    processImage,
    selectedBackground,
    setSelectedBackground,
    setCustomPrompt,
    history,
    undo,
  } = useImageStudioStore();

  const hasImage = !!(canvasImage || processedImage);
  const hasResult = !!processedImage;

  const handleToolClick = (action: PhotoRoomAction) => {
    if (!hasImage || isProcessing) return;
    processImage(action);
  };

  const handleBackgroundApply = (prompt: string) => {
    setCustomPrompt(prompt);
    if (hasImage && !isProcessing) {
      processImage('ai-background', { backgroundPrompt: prompt });
    }
  };

  const handleHistorySelect = (entry: { imageUrl: string }) => {
    // Встановити зображення з історії
    const store = useImageStudioStore.getState();
    store.setCanvasImage({
      id: `history-${Date.now()}`,
      url: entry.imageUrl,
      source: 'processed',
    });
  };

  return (
    <div
      className="w-[260px] flex flex-col h-full"
      style={{
        background: 'rgba(8, 8, 12, 0.95)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* AI Tools */}
      <div className="p-3 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}>
        <p
          className="text-[10px] font-semibold uppercase mb-2.5"
          style={{
            color: '#6b7280',
            letterSpacing: '1.5px',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          AI інструменти
        </p>

        <div className="grid grid-cols-2 gap-1.5">
          {AI_TOOLS.map((tool) => {
            const isActive = activeAction === tool.action && isProcessing;
            const disabled = !hasImage || isProcessing;

            return (
              <button
                key={tool.action}
                onClick={() => handleToolClick(tool.action)}
                disabled={disabled}
                className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg transition-all"
                style={{
                  background: isActive
                    ? 'rgba(168, 85, 247, 0.15)'
                    : disabled
                      ? 'rgba(255, 255, 255, 0.02)'
                      : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${
                    isActive
                      ? 'rgba(168, 85, 247, 0.3)'
                      : 'rgba(255, 255, 255, 0.04)'
                  }`,
                  color: disabled ? '#374151' : '#e5e7eb',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.5 : 1,
                }}
              >
                {isActive ? (
                  <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#a855f7' }} />
                ) : (
                  <span className="text-base">{tool.emoji}</span>
                )}
                <span className="text-[10px]">{tool.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Background presets */}
      <div
        className="p-3 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}
      >
        <BackgroundPicker
          selected={selectedBackground}
          onSelect={setSelectedBackground}
          onApply={handleBackgroundApply}
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

      {/* Save button (sticky bottom) */}
      <div
        className="p-3 border-t"
        style={{ borderColor: 'rgba(255, 255, 255, 0.06)' }}
      >
        <button
          onClick={onSave}
          disabled={!hasResult || isProcessing || isSaving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background:
              !hasResult || isProcessing || isSaving
                ? 'rgba(255, 255, 255, 0.05)'
                : 'linear-gradient(135deg, #a855f7, #ec4899)',
            color:
              !hasResult || isProcessing || isSaving
                ? '#6b7280'
                : '#ffffff',
            cursor:
              !hasResult || isProcessing || isSaving
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
