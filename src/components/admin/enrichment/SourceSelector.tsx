'use client';

import { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';

interface Props {
  brandId: string | null;
  selectedSources: string[];
  onSourcesChange: (sources: string[]) => void;
}

interface SourceItem {
  id: string;
  name: string;
  url: string;
  type: string;
}

export function SourceSelector({ brandId, selectedSources, onSourcesChange }: Props) {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    fetchSources();
  }, [brandId]);

  async function fetchSources() {
    try {
      // Fetch brand-specific + marketplace sources
      const params = brandId ? `?brand_id=${brandId}` : '';
      const res = await fetch(`/api/enrichment/sources${params}`);
      if (res.ok) {
        const data = await res.json();
        setSources(data.sources || []);
        // Auto-select brand sources
        const brandSources = (data.sources || [])
          .filter((s: SourceItem) => s.type === 'brand_site')
          .map((s: SourceItem) => s.url);
        if (brandSources.length > 0 && selectedSources.length === 0) {
          onSourcesChange(brandSources);
        }
      }
    } catch (err) {
      console.error('[SourceSelector] Fetch sources failed:', err);
    }
  }

  function toggleSource(url: string) {
    if (selectedSources.includes(url)) {
      onSourcesChange(selectedSources.filter(s => s !== url));
    } else {
      onSourcesChange([...selectedSources, url]);
    }
  }

  function addCustomSource() {
    if (!newUrl || !newUrl.startsWith('http')) return;
    if (!selectedSources.includes(newUrl)) {
      onSourcesChange([...selectedSources, newUrl]);
    }
    setNewUrl('');
  }

  return (
    <div className="space-y-2">
      {sources.map(s => (
        <label key={s.id} className="flex items-center gap-2 text-xs text-white/60 cursor-pointer hover:text-white/80">
          <input
            type="checkbox"
            checked={selectedSources.includes(s.url)}
            onChange={() => toggleSource(s.url)}
            className="rounded border-white/20 bg-white/5"
          />
          <span className="truncate">{s.name}</span>
          <span className="text-[10px] text-white/20 ml-auto">
            {s.type === 'brand_site' ? '(сайт бренду)' : s.type === 'marketplace' ? '(маркетплейс)' : `(${s.type})`}
          </span>
        </label>
      ))}

      {/* Custom sources already selected but not in DB */}
      {selectedSources.filter(url => !sources.find(s => s.url === url)).map(url => (
        <div key={url} className="flex items-center gap-2 text-xs text-white/60">
          <input type="checkbox" checked readOnly className="rounded border-white/20 bg-white/5" />
          <span className="truncate flex-1">{url}</span>
          <button onClick={() => onSourcesChange(selectedSources.filter(s => s !== url))} className="text-white/20 hover:text-red-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}

      <div className="flex gap-1.5">
        <input
          type="url"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          placeholder="https://..."
          className="flex-1 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/15 focus:outline-none focus:border-[#a855f7]/50"
          onKeyDown={e => e.key === 'Enter' && addCustomSource()}
        />
        <button
          onClick={addCustomSource}
          disabled={!newUrl}
          className="px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 disabled:opacity-30 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
