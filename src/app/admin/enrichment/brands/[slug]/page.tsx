'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  Save, Play, Sparkles, Globe, Settings, TestTube,
  Check, Loader2, AlertTriangle, ChevronDown, ChevronRight, Zap, ShieldAlert, X,
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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

  const hasSelectors = Object.values(selectors).some(v => v.length > 0);
  const isConfigured = hasSelectors && sourceUrl;

  useEffect(() => {
    fetchBrand();
  }, [slug]);

  async function fetchBrand() {
    setLoading(true);
    try {
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
        if (b.parse_config.parse_options) {
          setParseOptions({ ...parseOptions, ...b.parse_config.parse_options });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load brand');
    } finally {
      setLoading(false);
    }
  }

  async function handleAutoSetup() {
    if (!sourceUrl) {
      setError('Введіть URL сайту бренду');
      return;
    }

    setDetecting(true);
    setError(null);
    setSuccess(null);
    try {
      // 1. Auto-detect selectors
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
      }

      // 2. Auto-save
      if (brand) {
        const saveRes = await fetch(`/api/admin/brands/${brand.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo_source_url: sourceUrl || null,
            photo_source_type: sourceType,
            info_source_url: infoUrl || sourceUrl || null,
            parse_config: {
              product_url_pattern: productPattern || undefined,
              search_url_pattern: searchPattern || undefined,
              selectors: data.selectors || selectors,
              parse_options: parseOptions,
              auto_detected: true,
              detection_date: new Date().toISOString(),
            },
          }),
        });
        if (!saveRes.ok) {
          const saveData = await saveRes.json();
          throw new Error(saveData.error || 'Save failed');
        }
      }

      const confidence = Math.round((data.confidence || 0) * 100);
      setSuccess(`Готово! Claude проаналізував сайт і знайшов селектори (точність: ${confidence}%). Налаштування збережено.`);

      // 3. Auto-run test
      if (brand) {
        setTesting(true);
        try {
          const testRes = await fetch('/api/enrichment/parse-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ brand_id: brand.id }),
          });
          const testData = await testRes.json();
          if (testRes.ok) {
            setTestResult(testData);
          }
        } catch {
          // Test is optional
        } finally {
          setTesting(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Auto-setup failed');
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
          {isConfigured && (
            <Link
              href="/admin/enrichment/pipeline"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Запустити pipeline
            </Link>
          )}
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

      {/* ═══════ MAIN: Quick Setup ═══════ */}
      <section className="bg-gradient-to-br from-[#a855f7]/5 to-[#06b6d4]/5 rounded-xl border border-[#a855f7]/20 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#a855f7]/15 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-[#a855f7]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Швидке налаштування</h2>
            <p className="text-sm text-white/50 mt-1">
              Вкажіть URL сайту бренду — Claude автоматично знайде структуру сторінок і налаштує парсер.
              Потім товари зіставляються за артикулом, назвою та обсягом (мл).
            </p>
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5">URL сайту бренду</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://dark.ua або https://brand.com/catalog"
              className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.06] border border-white/[0.1] text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#a855f7]/50"
            />
            <button
              onClick={() => {
                if (!sourceUrl) { setError('Введіть URL сайту бренду'); return; }
                setShowConfirm(true);
              }}
              disabled={detecting || !sourceUrl}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-40 text-white text-sm font-medium transition-colors whitespace-nowrap"
            >
              {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {detecting ? 'Аналізую...' : 'Налаштувати автоматично'}
            </button>
          </div>
        </div>

        {/* Status indicator */}
        {isConfigured && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20">
            <Check className="w-4 h-4 text-[#22c55e]" />
            <span className="text-sm text-[#22c55e]">Парсер налаштовано</span>
            <span className="text-xs text-white/30 ml-auto">
              {Object.values(selectors).filter(v => v).length} селекторів знайдено
            </span>
          </div>
        )}
      </section>

      {/* ═══════ Test Result ═══════ */}
      {testResult && (
        <section className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-3">
          <div className="flex items-center gap-2">
            <TestTube className="w-4 h-4 text-[#06b6d4]" />
            <h2 className="text-sm font-semibold text-white">Результат тесту</h2>
          </div>
          <div className="text-xs text-white/40">
            URL: <a href={testResult.url} target="_blank" rel="noopener noreferrer" className="text-[#06b6d4] hover:underline">{testResult.url}</a>
          </div>
          <div className="bg-white/[0.02] rounded-lg p-3 space-y-2 text-xs">
            {testResult.parsed.title && (
              <div><span className="text-white/40">Назва:</span> <span className="text-white">{testResult.parsed.title}</span></div>
            )}
            {testResult.parsed.description && (
              <div><span className="text-white/40">Опис:</span> <span className="text-white/70">{testResult.parsed.description.slice(0, 200)}...</span></div>
            )}
            {testResult.parsed.photo_urls && (
              <div><span className="text-white/40">Фото:</span> <span className="text-[#22c55e]">{testResult.parsed.photo_urls.length} знайдено</span></div>
            )}
            {testResult.parsed.specs && (
              <div><span className="text-white/40">Характеристики:</span> <span className="text-white/70">{Object.keys(testResult.parsed.specs).length} полів</span></div>
            )}
            {testResult.parsed.composition && (
              <div><span className="text-white/40">Склад:</span> <span className="text-white/70">{testResult.parsed.composition.slice(0, 150)}</span></div>
            )}
            {!testResult.parsed.title && !testResult.parsed.description && !testResult.parsed.photo_urls && (
              <div className="text-white/30">Парсер не знайшов даних — спробуйте налаштувати селектори вручну (розширені)</div>
            )}
          </div>
          <button
            onClick={handleTestParser}
            disabled={testing}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#06b6d4]/10 hover:bg-[#06b6d4]/20 text-[#06b6d4] text-xs font-medium transition-colors"
          >
            {testing ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" />}
            Тест ще раз
          </button>
        </section>
      )}

      {/* ═══════ ADVANCED: Collapsible ═══════ */}
      <div className="border border-white/[0.06] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-white/30" />
            <span className="text-sm text-white/50">Розширені налаштування</span>
            <span className="text-[10px] text-white/20">CSS-селектори, URL-патерни, опції парсера</span>
          </div>
          {showAdvanced ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
        </button>

        {showAdvanced && (
          <div className="p-5 pt-2 space-y-5 border-t border-white/[0.04]">
            {/* Source type & info URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <div>
                <label className="block text-xs text-white/40 mb-1.5">URL для AI enrichment</label>
                <input
                  type="url"
                  value={infoUrl}
                  onChange={(e) => setInfoUrl(e.target.value)}
                  placeholder="https://brand.ua"
                  className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-[#a855f7]/50"
                />
              </div>
            </div>

            {/* CSS Selectors */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase">CSS-селектори</h3>
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
            </div>

            {/* Parse options */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase">Що парсити</h3>
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
            </div>

            {/* URL Mapping */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-white/50 uppercase">Маппінг артикулу → URL</h3>
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
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Зберегти
            </button>
          </div>
        )}
      </div>

      {/* ═══════ CONFIRMATION DIALOG ═══════ */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Підтвердження</h3>
                <p className="text-sm text-white/50 mt-1">
                  Claude проаналізує сайт і збереже нові CSS-селектори для парсингу. Це перезапише попередні налаштування.
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="p-1 rounded-lg hover:bg-white/5 text-white/30 hover:text-white/60 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white/[0.03] rounded-lg p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/40">Бренд:</span>
                <span className="text-white">{brand?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/40">URL:</span>
                <span className="text-white truncate max-w-[200px]">{sourceUrl}</span>
              </div>
              {hasSelectors && (
                <div className="flex items-start gap-2 pt-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-400/70">Існуючі селектори будуть замінені</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium transition-colors"
              >
                Скасувати
              </button>
              <button
                onClick={() => { setShowConfirm(false); handleAutoSetup(); }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#a855f7] hover:bg-[#9333ea] text-white text-sm font-medium transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Підтвердити
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
