"use client";

import { useEffect, useRef, useCallback } from 'react';
import { Search, Loader2, Package, X } from 'lucide-react';
import { useImageStudioStore } from '@/store/image-studio-store';
import type { ProductImage, SelectedImage } from '@/lib/photoroom/types';

export function ProductSearchPanel() {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    setSearchResults,
    isSearching,
    setIsSearching,
    selectedImages,
    addSelectedImage,
    removeSelectedImage,
    setCanvasImage,
  } = useImageStudioStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced search
  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setSearchResults([]);
        setIsSearching(false);
        return;
      }

      // Скасувати попередній запит
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setIsSearching(true);

      try {
        const res = await fetch(
          `/api/admin/products/search?q=${encodeURIComponent(q)}&limit=20`,
          { signal: ac.signal }
        );
        if (!res.ok) throw new Error('Search failed');
        const data: ProductImage[] = await res.json();
        setSearchResults(data);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [setSearchResults, setIsSearching]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, doSearch]);

  const handleProductClick = (product: ProductImage) => {
    const img: SelectedImage = {
      id: `${product.id}-main`,
      url: product.main_image,
      productName: product.name,
      productSku: product.sku,
      source: 'product',
    };
    addSelectedImage(img);
  };

  const handleDragStart = (e: React.DragEvent, url: string, name: string, sku: string) => {
    e.dataTransfer.setData('text/plain', url);
    e.dataTransfer.setData('application/x-studio-image', JSON.stringify({
      id: `drag-${Date.now()}`,
      url,
      productName: name,
      productSku: sku,
      source: 'product',
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleSelectedDragStart = (e: React.DragEvent, img: SelectedImage) => {
    e.dataTransfer.setData('text/plain', img.url);
    e.dataTransfer.setData('application/x-studio-image', JSON.stringify(img));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      className="w-[320px] flex flex-col h-full"
      style={{
        background: 'var(--a-bg)',
        borderRight: '1px solid var(--a-border)',
      }}
    >
      {/* Header */}
      <div className="p-3 border-b" style={{ borderColor: 'var(--a-border)' }}>
        <p
          className="text-[10px] font-semibold uppercase mb-2"
          style={{
            color: 'var(--a-text-3)',
            letterSpacing: '1.5px',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          Пошук товарів
        </p>

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            background: 'var(--a-bg-hover)',
            border: '1px solid var(--a-border)',
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--a-text-4)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Назва, SKU, бренд..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--a-text-4)]"
            style={{ color: 'var(--a-text-body)' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')}>
              <X className="w-3.5 h-3.5" style={{ color: 'var(--a-text-3)' }} />
            </button>
          )}
          {isSearching && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--a-accent)' }} />}
        </div>
      </div>

      {/* Results list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {searchResults.length === 0 && searchQuery && !isSearching && (
          <div className="text-center py-8">
            <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--a-border)' }} />
            <p className="text-xs" style={{ color: 'var(--a-text-4)' }}>
              Нічого не знайдено
            </p>
          </div>
        )}

        {searchResults.length === 0 && !searchQuery && (
          <div className="text-center py-8">
            <Search className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--a-border)' }} />
            <p className="text-xs" style={{ color: 'var(--a-text-4)' }}>
              Введіть назву, SKU або бренд
            </p>
          </div>
        )}

        {searchResults.map((product) => (
          <div
            key={product.id}
            draggable
            onDragStart={(e) => handleDragStart(e, product.main_image, product.name, product.sku)}
            onClick={() => handleProductClick(product)}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all group"
            style={{
              background: 'var(--a-bg-hover)',
              border: '1px solid transparent',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--a-bg-hover)';
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(168, 85, 247, 0.1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'var(--a-bg-hover)';
              (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
            }}
          >
            <img
              src={product.main_image}
              alt={product.name}
              className="w-10 h-10 rounded-md object-cover flex-shrink-0"
              style={{ background: 'var(--a-bg-card)' }}
              draggable={false}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate" style={{ color: 'var(--a-text-body)' }}>
                {product.name}
              </p>
              <p
                className="text-[10px] truncate"
                style={{
                  color: 'var(--a-text-4)',
                  fontFamily: 'JetBrains Mono, monospace',
                  letterSpacing: '0.5px',
                }}
              >
                {product.sku} · {product.brand}
              </p>
            </div>

            {/* Додаткові зображення */}
            {product.additional_images && product.additional_images.length > 0 && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                style={{
                  background: 'var(--a-bg-hover)',
                  color: 'var(--a-text-3)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                +{product.additional_images.length}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Selected images tray */}
      {selectedImages.length > 0 && (
        <div
          className="p-3 border-t"
          style={{ borderColor: 'var(--a-border)' }}
        >
          <p
            className="text-[10px] font-semibold uppercase mb-2"
            style={{
              color: 'var(--a-text-3)',
              letterSpacing: '1.5px',
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            Обрані ({selectedImages.length})
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {selectedImages.map((img) => (
              <div
                key={img.id}
                className="relative group"
                draggable
                onDragStart={(e) => handleSelectedDragStart(e, img)}
              >
                <img
                  src={img.url}
                  alt={img.productName || ''}
                  className="w-12 h-12 rounded-md object-cover cursor-grab"
                  style={{ background: 'var(--a-bg-card)', border: '1px solid var(--a-border)' }}
                  draggable={false}
                  onClick={() => setCanvasImage(img)}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSelectedImage(img.id);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: '#ef4444' }}
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
