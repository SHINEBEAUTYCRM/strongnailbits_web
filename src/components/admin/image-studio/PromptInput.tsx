"use client";

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isProcessing: boolean;
  disabled?: boolean;
}

export function PromptInput({ value, onChange, onSubmit, isProcessing, disabled }: PromptInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isProcessing && !disabled) {
        onSubmit();
      }
    }
  };

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        background: 'rgba(8, 8, 12, 0.6)',
        border: `1px solid ${isFocused ? 'rgba(168, 85, 247, 0.3)' : 'rgba(255, 255, 255, 0.06)'}`,
      }}
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Опишіть бажаний фон... (наприклад: мармуровий стіл з м'якими тінями)"
        rows={2}
        disabled={disabled}
        className="w-full resize-none bg-transparent px-3.5 py-2.5 text-sm outline-none placeholder:text-[#4b5563]"
        style={{ color: '#e5e7eb' }}
      />

      <div className="flex items-center justify-between px-3 pb-2.5">
        <span
          className="text-[10px]"
          style={{
            color: '#4b5563',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          Enter — створити · Shift+Enter — новий рядок
        </span>

        <button
          onClick={onSubmit}
          disabled={!value.trim() || isProcessing || disabled}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all"
          style={{
            background:
              !value.trim() || isProcessing || disabled
                ? 'rgba(255, 255, 255, 0.05)'
                : 'linear-gradient(135deg, #a855f7, #ec4899)',
            color:
              !value.trim() || isProcessing || disabled
                ? '#6b7280'
                : '#ffffff',
            cursor:
              !value.trim() || isProcessing || disabled
                ? 'not-allowed'
                : 'pointer',
          }}
        >
          {isProcessing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5" />
          )}
          Створити
        </button>
      </div>
    </div>
  );
}
