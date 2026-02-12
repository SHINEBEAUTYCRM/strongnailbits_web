"use client";

// ================================================================
//  ShineShop OS — Image Upload with AI Studio
//  Замінює звичайний image upload. Дві кнопки: завантажити + AI Studio
// ================================================================

import { useRef, useState } from 'react';
import { Upload, Sparkles, Loader2, X, ImageIcon } from 'lucide-react';
import { ImageStudio } from './ImageStudio';
import type { StudioContext } from '@/lib/photoroom/types';

export interface ImageUploadWithStudioProps {
  value?: string;
  onChange: (url: string) => void;
  context: StudioContext;
  entityId: string;
  suggestedSize?: { width: number; height: number };
  label?: string;
}

export function ImageUploadWithStudio({
  value,
  onChange,
  context,
  entityId,
  suggestedSize,
  label,
}: ImageUploadWithStudioProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Оберіть зображення');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Файл завеликий (макс. 10 МБ)');
      return;
    }

    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || 'Помилка завантаження');
        return;
      }

      onChange(data.url);
    } catch {
      setError('Помилка мережі');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStudioSave = async (imageUrl: string) => {
    onChange(imageUrl);
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div>
      {label && (
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: '#71717a' }}
        >
          {label}
        </label>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview */}
      {value && (
        <div className="relative mb-3 group">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: '#111116',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <img
              src={value}
              alt=""
              className="w-full max-h-[200px] object-contain"
              style={{ background: '#0a0a10' }}
            />
          </div>
          <button
            onClick={handleRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ background: 'rgba(239, 68, 68, 0.9)' }}
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      )}

      {/* Empty state */}
      {!value && !isUploading && (
        <div
          className="rounded-xl p-6 mb-3"
          style={{
            background: '#111116',
            border: '1px dashed #27272a',
          }}
        >
          <div className="flex justify-center mb-3">
            <ImageIcon className="w-10 h-10" style={{ color: '#1e1e2a' }} />
          </div>
          <p className="text-center text-xs" style={{ color: '#4b5563' }}>
            Оберіть спосіб додавання зображення
          </p>
        </div>
      )}

      {/* Uploading */}
      {isUploading && (
        <div
          className="rounded-xl p-6 mb-3 flex flex-col items-center gap-3"
          style={{
            background: '#111116',
            border: '1px solid #1e1e2a',
          }}
        >
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#a855f7' }} />
          <p className="text-sm" style={{ color: '#a1a1aa' }}>
            Завантаження...
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <p
          className="text-xs mb-2 px-3 py-2 rounded-lg"
          style={{ color: '#f87171', background: '#450a0a' }}
        >
          {error}
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
          style={{
            background: '#141420',
            border: '1px solid #1e1e2a',
            color: '#a1a1aa',
          }}
        >
          {isUploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          Завантажити
        </button>

        <ImageStudio
          context={context}
          entityId={entityId}
          currentImage={value}
          suggestedSize={suggestedSize}
          onSave={handleStudioSave}
          trigger={
            <div
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(236, 72, 153, 0.15))',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                color: '#c084fc',
              }}
            >
              <Sparkles className="w-4 h-4" />
              Створити з AI
            </div>
          }
        />
      </div>

      <p
        className="text-center text-[10px] mt-2"
        style={{ color: '#3f3f46' }}
      >
        JPG, PNG, WebP · до 10 МБ
      </p>
    </div>
  );
}
