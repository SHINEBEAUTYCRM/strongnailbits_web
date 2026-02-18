"use client";

import { useState } from "react";
import { Camera, Download, Check, Loader2, Star } from "lucide-react";

interface SourceImage {
  src: string;
  alt: string;
  isProduct: boolean;
}

interface SourceImagePickerProps {
  productId: string;
  productName: string;
  productSku?: string;
  brandSourceUrls: string[];
  currentMainImage?: string;
  onImagesDownloaded: (mainUrl: string | null, galleryUrls: string[]) => void;
}

export function SourceImagePicker({
  productId,
  productName,
  productSku,
  brandSourceUrls,
  currentMainImage,
  onImagesDownloaded,
}: SourceImagePickerProps) {
  const [searching, setSearching] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [images, setImages] = useState<SourceImage[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [mainIndex, setMainIndex] = useState<number>(0);
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState("");
  const [downloadResult, setDownloadResult] = useState("");

  const handleSearch = async () => {
    setSearching(true);
    setError("");
    setImages([]);
    setSelected(new Set());
    setDownloadResult("");

    try {
      const res = await fetch("/api/admin/ai/fetch-source", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urls: brandSourceUrls,
          productName,
          productSku,
        }),
      });

      const data = await res.json();
      const allImages: SourceImage[] = [];

      for (const source of data.sources || []) {
        if (source.images?.length > 0) {
          setSourceUrl(source.url);
          allImages.push(
            ...source.images.filter((img: SourceImage) => img.isProduct),
          );
        }
      }

      if (allImages.length === 0) {
        setError("Фото не знайдено на сайтах бренду");
      } else {
        setImages(allImages);
        const autoSelect = new Set(
          allImages.slice(0, Math.min(5, allImages.length)).map((_, i) => i),
        );
        setSelected(autoSelect);
      }
    } catch {
      setError("Помилка пошуку");
    } finally {
      setSearching(false);
    }
  };

  const handleDownload = async () => {
    const selectedIndices = [...selected].sort((a, b) => a - b);
    const selectedUrls = selectedIndices.map((i) => images[i].src);
    if (selectedUrls.length === 0) return;

    const mainUrl = images[mainIndex]?.src;
    const orderedUrls = selected.has(mainIndex)
      ? [mainUrl, ...selectedUrls.filter((u) => u !== mainUrl)]
      : selectedUrls;

    setDownloading(true);
    setError("");
    setDownloadResult("");

    try {
      const res = await fetch("/api/admin/ai/download-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          imageUrls: orderedUrls,
          setAsMain: !currentMainImage,
        }),
      });

      const data = await res.json();

      if (data.success > 0) {
        const successUrls = data.results
          .filter((r: { success: boolean }) => r.success)
          .map((r: { stored: string }) => r.stored);

        const newMain = !currentMainImage ? successUrls[0] || null : null;
        const gallery = newMain ? successUrls.slice(1) : successUrls;
        onImagesDownloaded(newMain, gallery);

        setDownloadResult(
          `Завантажено ${data.success} з ${data.total} фото`,
        );
        setImages([]);
        setSelected(new Set());
      } else {
        setError(`Помилка завантаження: ${data.results?.[0]?.error || "невідома"}`);
      }
    } catch {
      setError("Мережева помилка");
    } finally {
      setDownloading(false);
    }
  };

  const toggleSelect = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const setAsMain = (index: number) => {
    setMainIndex(index);
    setSelected((prev) => new Set(prev).add(index));
  };

  if (brandSourceUrls.length === 0) {
    return (
      <p className="text-[11px] mt-1" style={{ color: "var(--a-text-5)" }}>
        Налаштуйте URL джерел для бренду щоб шукати фото
      </p>
    );
  }

  return (
    <div className="space-y-2 mt-2">
      <button
        onClick={handleSearch}
        disabled={searching}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors disabled:opacity-40"
        style={{
          background: "#1a0f2e",
          color: "#a78bfa",
          border: "1px solid #7c3aed40",
        }}
      >
        {searching ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
        {searching ? "Шукаю фото..." : "Знайти фото на сайті бренду"}
      </button>

      {error && (
        <p className="text-[11px]" style={{ color: "#f87171" }}>
          {error}
        </p>
      )}

      {downloadResult && (
        <p className="text-[11px]" style={{ color: "#4ade80" }}>
          {downloadResult}
        </p>
      )}

      {images.length > 0 && (
        <div
          className="rounded-lg p-3"
          style={{
            background: "var(--a-bg-input)",
            border: "1px solid var(--a-border)",
          }}
        >
          <p className="text-[11px] mb-2" style={{ color: "var(--a-text-4)" }}>
            Знайдено {images.length} фото з {sourceUrl}
          </p>

          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {images.map((img, i) => (
              <div
                key={i}
                className="relative cursor-pointer rounded-md overflow-hidden transition-all"
                style={{
                  border: selected.has(i)
                    ? "2px solid #7c3aed"
                    : "2px solid transparent",
                  outline: selected.has(i)
                    ? "2px solid #7c3aed40"
                    : "none",
                }}
                onClick={() => toggleSelect(i)}
                onDoubleClick={() => setAsMain(i)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  className="aspect-square object-cover w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />

                {selected.has(i) && (
                  <div
                    className="absolute top-0.5 right-0.5 rounded-full p-0.5"
                    style={{ background: "#7c3aed" }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}

                {i === mainIndex && selected.has(i) && (
                  <div
                    className="absolute bottom-0 left-0 right-0 text-center text-[9px] py-0.5 font-medium"
                    style={{ background: "#7c3aed", color: "white" }}
                  >
                    <Star className="w-2.5 h-2.5 inline -mt-0.5" /> main
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={downloading || selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium text-white disabled:opacity-40"
              style={{ background: "#7c3aed" }}
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              {downloading
                ? "Завантажую..."
                : `Скачати ${selected.size} фото → Storage`}
            </button>
            <span className="text-[10px]" style={{ color: "var(--a-text-5)" }}>
              WebP · 1200×1200 · q85 · 2x клік = main
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
