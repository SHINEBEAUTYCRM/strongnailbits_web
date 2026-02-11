'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Save, Play, Sparkles, Globe, Settings, TestTube,
  Check, Loader2, AlertTriangle,
} from 'lucide-react';

interface BrandConfig {
  id: string;
  name: string;
  slug: string;
  photo_source_url: string;
  photo_source_type: string;
  info_source_url: string;
  parse_config: {
    product_url_pattern?: string;
    search_url_pattern?: string;
    selectors: {
      title?: string;
      description?: string;
      photo?: string;
      specs?: string;
      composition?: string;
      instructions?: string;
    };
    parse_options: {
      photos: boolean;
      description: boolean;
      specs: boolean;
      composition: boolean;
      instructions: boolean;
      palette: boolean;
      price_rrp: boolean;
    };
    auto_detected: boolean;
    detection_date?: string;
  };
}

interface TestResult {
  url: string;
  parsed: {
    title?: string;
    description?: string;
    specs?: Record<string, string>;
    composition?: string;
    instructions?: string;
    photo_urls?: string[];
  };
}

export default function BrandEnrichmentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [brand, setBrand] = useState<BrandConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceType, setSourceType] = useState('website');
  const [infoUrl, setInfoUrl] = useState('');
  const [productPattern, setProductPattern] = useState('');
  const [searchPattern, setSearchPattern] = useState('');
  const [selectors, setSelectors] = useState({
    title: '', description: '', photo: '', specs: '', composition: '', instructions: '',
  });
  const [parseOptions, setParseOptions] = useState({
    photos: true, description: true, specs: true,
    composition: true, instructions: true, palette: true, price_rrp: false,
  });

  useEffect(() => {
    fetchBrand();
  }, [slug]);

  async function fetchBrand() {
    setLoading(true);
    try {
      // Fetch brand data via admin API
      const res = await fetch(`/api/admin/brands?slug=${slug}`);
      if (!res.ok) throw new Error('Brand not found');
      const data = await res.json();
      const b = Array.isArray(data) ? data[0] : data;

      setBrand(b);
      setSourceUrl(b.photo_source_url || '');
      setSourceType(b.photo_source_type || 'website');
      setInfoUrl(b.info_source_url || '');

      if (b.parse_config) {
        setProductPattern(b.parse_config.product_url_pattern || '');
        setSearchPattern(b.parse_config.search_url_pattern || '');
        setSelectors({
          title: b.parse_config.selectors?.title || '',
          description: b.parse_config.selectors?.description || '',
          photo: b.parse_config.selectors?.photo || '',
          specs: b.parse_config.selectors?.specs || '',
          composition: b.parse_config.selectors?.composition || '',
          instructions: b.parse_config.selectors?.instructions || '',
        });
        setParseOptions({
          ...parseOptions,
          ...b.parse_config.parse_options,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brand');
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoDetect() {
    if (!sourceUrl) {
      setError('Введіть URL каталогу');
      return;
    }

    setDetecting(true);
    setError(null);
    try {
      const res = await fetch('/api/enrichment/auto-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: sourceUrl }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (data.selectors) {
        setSelectors({
          title: data.selectors.title || '',
          description: data.selectors.description || '',
          photo: data.selectors.photo || '',
          specs: data.selectors.specs || '',
          composition: data.selectors.composition || '',
          instructions: data.selectors.instructions || '',
        });
        setSuccess(`Auto-detect: знайдено селектори (confidence: ${Math.round((data.confidence || 0) * 100)}%)`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-detect failed');
    } finally {
      setDetecting(false);
    }
  }

  async function handleTestParser() {
    if (!brand) return;

    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await fetch('/api/enrichment/parse-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_id: brand.id }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setTestResult(data);
      setSuccess('Тест парсера пройшов успішно');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parser test failed');
    } finally {
      setTesting(false);
    }
  }

  async function handleSave() {
    if (!brand) return;

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/brands/${brand.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_source_url: sourceUrl || null,
          photo_source_type: sourceType,
          info_source_url: infoUrl || null,
          parse_config: {
            product_url_pattern: productPattern || undefined,
            search_url_pattern: searchPattern || undefined,
            selectors,
            parse_options: parseOptions,
            auto_detected: brand.parse_config?.auto_detected || false,
            detection_date: brand.parse_config?.detection_date,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Save failed');
      }

      setSuccess('Збережено');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-[#a855f7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-white/40 mb-1">
            <Link href="/admin/enrichment" className="hover:text-white/60">Enrichment</Link>
            <span>/</span>
            <Link href="/admin/enrichment/brands" className="hover:text-white/60">Бренди</Link>
            <span>/</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{brand?.name || slug}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white text-sm font-medium transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Зберегти
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400">✕</button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
          <Check className="w-4 h-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-400/60 hover:text-green-400">✕</button>
        </div>
      )}

      {/* Source URLs */}
      <section className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Globe className="w-4 h-4 text-[#a855f7]" />
          Джерела даних
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">URL каталогу (для фото)</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://brand.ua/catalog"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#a855f7]/50"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Тип джерела</label>
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white focus:outline-none focus:border-[#a855f7]/50"
            >
              <option value="website">Website</option>
              <option value="api">API</option>
              <option value="feed">Product Feed</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-white/40 mb-1.5">URL для AI enrichment (інфо)</label>
            <input
              type="url"
              value={infoUrl}
              onChange={(e) => setInfoUrl(e.target.value)}
              placeholder="https://brand.ua"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#a855f7]/50"
            />
          </div>
        </div>
      </section>

      {/* CSS Selectors */}
      <section className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#a855f7]" />
            CSS-селектори
          </h2>
          <button
            onClick={handleAutoDetect}
            disabled={detecting || !sourceUrl}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#a855f7]/10 hover:bg-[#a855f7]/20 disabled:opacity-40 text-[#a855f7] text-xs font-medium transition-colors"
          >
            {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Auto-detect
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(selectors) as (keyof typeof selectors)[]).map((key) => (
            <div key={key}>
              <label className="block text-xs text-white/40 mb-1 capitalize">{key}</label>
              <input
                type="text"
                value={selectors[key]}
                onChange={(e) => setSelectors({ ...selectors, [key]: e.target.value })}
                placeholder={`.product-${key}`}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-mono placeholder:text-white/15 focus:outline-none focus:border-[#a855f7]/50"
              />
            </div>
          ))}
        </div>
      </section>

      {/* Parse options */}
      <section className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Що парсити</h2>
        <div className="flex flex-wrap gap-3">
          {(Object.keys(parseOptions) as (keyof typeof parseOptions)[]).map((key) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={parseOptions[key]}
                onChange={(e) => setParseOptions({ ...parseOptions, [key]: e.target.checked })}
                className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#a855f7] focus:ring-[#a855f7]/50"
              />
              <span className="text-sm text-white/70 capitalize">{key.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </section>

      {/* URL Mapping */}
      <section className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-white">Маппінг артикулу → URL</h2>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Product URL pattern</label>
            <input
              type="text"
              value={productPattern}
              onChange={(e) => setProductPattern(e.target.value)}
              placeholder="https://brand.ua/product/{article}"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-mono placeholder:text-white/15 focus:outline-none focus:border-[#a855f7]/50"
            />
            <p className="text-[10px] text-white/30 mt-1">{'{article}'} або {'{sku}'} — підставляється артикул товару</p>
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Search URL pattern</label>
            <input
              type="text"
              value={searchPattern}
              onChange={(e) => setSearchPattern(e.target.value)}
              placeholder="https://brand.ua/search?q={article}"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white font-mono placeholder:text-white/15 focus:outline-none focus:border-[#a855f7]/50"
            />
          </div>
        </div>
      </section>

      {/* Test Parser */}
      <section className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <TestTube className="w-4 h-4 text-[#06b6d4]" />
            Тест парсера
          </h2>
          <button
            onClick={handleTestParser}
            disabled={testing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#06b6d4]/10 hover:bg-[#06b6d4]/20 disabled:opacity-40 text-[#06b6d4] text-xs font-medium transition-colors"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
            Тест парсера
          </button>
        </div>

        {testResult && (
          <div className="space-y-3">
            <div className="text-xs text-white/40">
              URL: <a href={testResult.url} target="_blank" rel="noopener noreferrer" className="text-[#06b6d4] hover:underline">{testResult.url}</a>
            </div>
            <div className="bg-white/[0.02] rounded-lg p-3 space-y-2 text-xs">
              {testResult.parsed.title && (
                <div><span className="text-white/40">Title:</span> <span className="text-white">{testResult.parsed.title}</span></div>
              )}
              {testResult.parsed.description && (
                <div><span className="text-white/40">Description:</span> <span className="text-white/70">{testResult.parsed.description.slice(0, 200)}...</span></div>
              )}
              {testResult.parsed.photo_urls && (
                <div><span className="text-white/40">Photos:</span> <span className="text-[#22c55e]">{testResult.parsed.photo_urls.length} знайдено</span></div>
              )}
              {testResult.parsed.specs && (
                <div><span className="text-white/40">Specs:</span> <span className="text-white/70">{Object.keys(testResult.parsed.specs).length} полів</span></div>
              )}
              {testResult.parsed.composition && (
                <div><span className="text-white/40">Composition:</span> <span className="text-white/70">{testResult.parsed.composition.slice(0, 100)}</span></div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white text-sm font-medium transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Зберегти
        </button>
        <Link
          href="/admin/enrichment/pipeline"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
        >
          <Play className="w-4 h-4" />
          Запустити pipeline
        </Link>
      </div>
    </div>
  );
}
