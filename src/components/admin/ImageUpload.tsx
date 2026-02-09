"use client";

import { useState, useRef, useCallback } from "react";
import {
  Camera, Upload, Loader2, Wand2, Check, X, ImageIcon,
  RotateCcw, ZoomIn,
} from "lucide-react";

interface Props {
  /** Called with the final public URL after upload */
  onUpload: (url: string) => void;
  /** Current image URL (for preview) */
  currentUrl?: string;
  /** Label */
  label?: string;
  /** Compact mode for gallery thumbnails */
  compact?: boolean;
}

type Stage = "idle" | "preview" | "removing-bg" | "uploading";

export function ImageUpload({ onUpload, currentUrl, label, compact }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [preview, setPreview] = useState<string | null>(null);
  const [processed, setProcessed] = useState<string | null>(null);
  const [useOriginal, setUseOriginal] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const originalFileRef = useRef<File | null>(null);
  const processedBlobRef = useRef<Blob | null>(null);

  const reset = () => {
    setStage("idle");
    setPreview(null);
    setProcessed(null);
    setUseOriginal(false);
    setError("");
    setProgress("");
    originalFileRef.current = null;
    processedBlobRef.current = null;
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Оберіть зображення");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Файл завеликий (макс. 10 МБ)");
      return;
    }

    setError("");
    originalFileRef.current = file;

    // Show preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStage("preview");
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const removeBg = async () => {
    if (!originalFileRef.current) return;
    setStage("removing-bg");
    setProgress("Завантаження моделі нейромережі...");

    try {
      // Dynamic import to keep bundle small
      const { removeBackground } = await import("@imgly/background-removal");

      setProgress("Видалення фону... (може зайняти 10-30с)");

      const blob = await removeBackground(originalFileRef.current, {
        progress: (key: string, current: number, total: number) => {
          if (key === "compute:inference") {
            const pct = Math.round((current / total) * 100);
            setProgress(`Обробка... ${pct}%`);
          }
        },
      });

      processedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      setProcessed(url);
      setUseOriginal(false);
      setStage("preview");
      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка видалення фону");
      setStage("preview");
      setProgress("");
    }
  };

  const upload = async () => {
    setStage("uploading");
    setProgress("Завантаження на сервер...");

    try {
      let fileToUpload: Blob;
      let filename: string;

      if (!useOriginal && processedBlobRef.current) {
        fileToUpload = processedBlobRef.current;
        filename = `nobg-${Date.now()}.png`;
      } else if (originalFileRef.current) {
        fileToUpload = originalFileRef.current;
        filename = originalFileRef.current.name;
      } else {
        setError("Немає файлу для завантаження");
        setStage("preview");
        return;
      }

      const formData = new FormData();
      formData.append("file", fileToUpload, filename);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setError(data.error || "Помилка завантаження");
        setStage("preview");
        return;
      }

      onUpload(data.url);
      reset();
    } catch {
      setError("Помилка мережі");
      setStage("preview");
    }
  };

  // Compact gallery add button
  if (compact && stage === "idle") {
    return (
      <div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" />
        <div className="flex gap-2">
          <button onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
            style={{ background: "#111116", border: "1px dashed #27272a", color: "#52525b" }}>
            <Upload className="w-4 h-4" />
            <span className="text-[9px]">Файл</span>
          </button>
          <button onClick={() => cameraRef.current?.click()} className="w-20 h-20 rounded-lg flex flex-col items-center justify-center gap-1 transition-colors"
            style={{ background: "#111116", border: "1px dashed #27272a", color: "#52525b" }}>
            <Camera className="w-4 h-4" />
            <span className="text-[9px]">Камера</span>
          </button>
        </div>
        {error && <p className="text-xs mt-1" style={{ color: "#f87171" }}>{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {label && <label className="block text-xs font-medium mb-1.5" style={{ color: "#71717a" }}>{label}</label>}

      <input ref={fileRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" />

      {/* Idle state — pick source */}
      {stage === "idle" && (
        <div className="rounded-xl p-6" style={{ background: "#111116", border: "1px dashed #27272a" }}>
          {currentUrl ? (
            <div className="flex items-center gap-4 mb-4">
              <img src={currentUrl} alt="" className="w-16 h-16 rounded-lg object-cover" style={{ background: "#141420" }} />
              <p className="text-xs" style={{ color: "#52525b" }}>Поточне зображення</p>
            </div>
          ) : (
            <div className="flex justify-center mb-4">
              <ImageIcon className="w-10 h-10" style={{ color: "#1e1e2a" }} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all"
              style={{ background: "#141420", border: "1px solid #1e1e2a", color: "#a1a1aa" }}>
              <Upload className="w-4 h-4" /> Обрати файл
            </button>
            <button onClick={() => cameraRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all"
              style={{ background: "#0f1a2e", border: "1px solid #1e3a5f", color: "#60a5fa" }}>
              <Camera className="w-4 h-4" /> Зробити фото
            </button>
          </div>

          <p className="text-center text-[10px] mt-3" style={{ color: "#3f3f46" }}>
            JPG, PNG, WebP · до 10 МБ · фон буде видалено автоматично
          </p>
        </div>
      )}

      {/* Preview & processing */}
      {(stage === "preview" || stage === "removing-bg") && (
        <div className="rounded-xl overflow-hidden" style={{ background: "#111116", border: "1px solid #1e1e2a" }}>
          {/* Images comparison */}
          <div className="p-4">
            <div className="flex gap-3 justify-center">
              {/* Original */}
              <div className="text-center">
                <div className="relative rounded-lg overflow-hidden mb-2" style={{ background: "#0a0a10" }}>
                  {preview && (
                    <img src={preview} alt="Original"
                      className="max-h-[200px] max-w-[200px] object-contain"
                      style={{ opacity: useOriginal ? 1 : processed ? 0.5 : 1 }} />
                  )}
                  {useOriginal && (
                    <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#7c3aed" }}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
                <p className="text-[10px]" style={{ color: "#52525b" }}>Оригінал</p>
              </div>

              {/* Processed */}
              {processed && (
                <div className="text-center">
                  <div className="relative rounded-lg overflow-hidden mb-2"
                    style={{ background: "repeating-conic-gradient(#1a1a24 0% 25%, #111116 0% 50%) 50% / 16px 16px" }}>
                    <img src={processed} alt="No background"
                      className="max-h-[200px] max-w-[200px] object-contain"
                      style={{ opacity: useOriginal ? 0.5 : 1 }} />
                    {!useOriginal && (
                      <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#7c3aed" }}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px]" style={{ color: "#52525b" }}>Без фону</p>
                </div>
              )}
            </div>

            {/* Processing indicator */}
            {stage === "removing-bg" && (
              <div className="flex items-center justify-center gap-2 mt-4 py-3 rounded-lg" style={{ background: "#0a0a10" }}>
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#a855f7" }} />
                <p className="text-xs" style={{ color: "#a1a1aa" }}>{progress}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="px-4 pb-4 space-y-2">
            {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ color: "#f87171", background: "#450a0a" }}>{error}</p>}

            {stage === "preview" && !processed && (
              <div className="flex gap-2">
                <button onClick={removeBg}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: "#1e1030", border: "1px solid #581c87", color: "#c084fc" }}>
                  <Wand2 className="w-4 h-4" /> Видалити фон
                </button>
                <button onClick={() => { setUseOriginal(true); }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: "#141420", border: "1px solid #1e1e2a", color: "#71717a" }}>
                  Пропустити
                </button>
              </div>
            )}

            {stage === "preview" && processed && (
              <div className="flex gap-2">
                <button onClick={() => setUseOriginal(false)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-center"
                  style={!useOriginal ? { background: "#1e1030", border: "1px solid #581c87", color: "#c084fc" } : { background: "#141420", border: "1px solid #1e1e2a", color: "#71717a" }}>
                  Без фону
                </button>
                <button onClick={() => setUseOriginal(true)}
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-medium text-center"
                  style={useOriginal ? { background: "#1e1030", border: "1px solid #581c87", color: "#c084fc" } : { background: "#141420", border: "1px solid #1e1e2a", color: "#71717a" }}>
                  Оригінал
                </button>
              </div>
            )}

            {stage === "preview" && (processed || useOriginal) && (
              <button onClick={upload}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: "#7c3aed" }}>
                <Upload className="w-4 h-4" /> Завантажити
              </button>
            )}

            <div className="flex gap-2">
              {stage === "preview" && (
                <button onClick={reset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs"
                  style={{ color: "#52525b" }}>
                  <RotateCcw className="w-3.5 h-3.5" /> Скасувати
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Uploading */}
      {stage === "uploading" && (
        <div className="rounded-xl p-6 flex flex-col items-center gap-3" style={{ background: "#111116", border: "1px solid #1e1e2a" }}>
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#a855f7" }} />
          <p className="text-sm" style={{ color: "#a1a1aa" }}>{progress}</p>
        </div>
      )}
    </div>
  );
}
