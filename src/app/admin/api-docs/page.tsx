"use client";

// ================================================================
//  API Documentation — Interactive reference for all v1 endpoints
// ================================================================

import { useState, useCallback } from "react";
import {
  Package, Users, ShoppingBag, FileText, CreditCard, DollarSign,
  Heart, Gift, ChevronRight, Copy, Check, Play, ArrowRight,
  Code2, Shield, Zap, AlertTriangle, Globe,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { API_DOCS, STATUS_CODES, type DocEndpoint, type DocGroup } from "@/lib/api/docs-registry";

const ICON_MAP: Record<string, LucideIcon> = {
  Package, Users, ShoppingBag, FileText, CreditCard, DollarSign, Heart, Gift, Globe,
};

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  PATCH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  PUT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

const BASE_URL = "https://shineshopb2b.com";

// ─── Code generators ───
function curlExample(e: DocEndpoint, token: string): string {
  const url = `${BASE_URL}${e.path}`;
  let cmd = `curl -X ${e.method} "${url}"`;
  cmd += `\n  -H "Authorization: Bearer ${token || "sk_live_YOUR_TOKEN"}"`;
  cmd += `\n  -H "Content-Type: application/json"`;
  if (e.requestExample && ["POST", "PATCH", "PUT"].includes(e.method)) {
    cmd += `\n  -d '${JSON.stringify(e.requestExample, null, 2)}'`;
  }
  return cmd;
}

function jsExample(e: DocEndpoint, token: string): string {
  const url = `${BASE_URL}${e.path}`;
  let code = `const response = await fetch("${url}", {\n  method: "${e.method}",\n  headers: {\n    "Authorization": "Bearer ${token || "sk_live_YOUR_TOKEN"}",\n    "Content-Type": "application/json",\n  },`;
  if (e.requestExample && ["POST", "PATCH", "PUT"].includes(e.method)) {
    code += `\n  body: JSON.stringify(${JSON.stringify(e.requestExample, null, 4).split("\n").join("\n  ")}),`;
  }
  code += `\n});\n\nconst data = await response.json();\nconsole.log(data);`;
  return code;
}

function pythonExample(e: DocEndpoint, token: string): string {
  const url = `${BASE_URL}${e.path}`;
  let code = `import requests\n\nresponse = requests.${e.method.toLowerCase()}(\n    "${url}",\n    headers={\n        "Authorization": "Bearer ${token || "sk_live_YOUR_TOKEN"}",\n        "Content-Type": "application/json",\n    },`;
  if (e.requestExample && ["POST", "PATCH", "PUT"].includes(e.method)) {
    code += `\n    json=${JSON.stringify(e.requestExample, null, 4).split("\n").join("\n    ")},`;
  }
  code += `\n)\n\nprint(response.json())`;
  return code;
}

function onecExample(e: DocEndpoint, token: string): string {
  const url = e.path;
  let code = `// 1С:Підприємство — псевдокод\nHTTPЗ'єднання = Новий HTTPЗ'єднання("shineshopb2b.com", 443, , , , , Новий ЗахищенеЗ'єднанняOpenSSL());\n`;
  code += `HTTPЗапит = Новий HTTPЗапит("${url}");\n`;
  code += `HTTPЗапит.Заголовки.Вставити("Authorization", "Bearer ${token || "sk_live_ваш_токен"}");\n`;
  code += `HTTPЗапит.Заголовки.Вставити("Content-Type", "application/json");\n`;
  if (e.requestExample && ["POST", "PATCH", "PUT"].includes(e.method)) {
    code += `\nJSON = Новий ЗаписJSON();\n// ... серіалізація даних ...\nHTTPЗапит.ВстановитиТілоІзРядка(РядокJSON);\n`;
  }
  const methodMap: Record<string, string> = { GET: "Отримати", POST: "ВідправитиДляОбробки", PATCH: "Змінити", PUT: "Записати" };
  code += `\nВідповідь = HTTPЗ'єднання.${methodMap[e.method] || "ВідправитиДляОбробки"}(HTTPЗапит);\nКодСтатусу = Відповідь.КодСтану;\nТілоВідповіді = Відповідь.ОтриматиТілоЯкРядок();`;
  return code;
}

// ─── Components ───

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button onClick={copy} className="absolute right-2 top-2 rounded-md bg-[#1a1a24] p-1.5 text-zinc-500 hover:text-white transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  return (
    <div className="relative rounded-lg bg-[#0a0a0f] border border-[#1e1e2a] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#111116] border-b border-[#1e1e2a]">
        <span className="text-[10px] font-medium text-zinc-600 uppercase">{lang}</span>
      </div>
      <CopyBtn text={code} />
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap break-all">
        {code}
      </pre>
    </div>
  );
}

function EndpointDetail({ endpoint, token }: { endpoint: DocEndpoint; token: string }) {
  const [codeLang, setCodeLang] = useState<"curl" | "js" | "python" | "1c">("curl");
  const [tryResult, setTryResult] = useState<string | null>(null);
  const [trying, setTrying] = useState(false);

  const codeFn = { curl: curlExample, js: jsExample, python: pythonExample, "1c": onecExample };
  const code = codeFn[codeLang](endpoint, token);

  const handleTry = async () => {
    if (!token) { setTryResult("⚠ Введіть API-токен зверху"); return; }
    setTrying(true);
    setTryResult(null);
    try {
      const opts: RequestInit = {
        method: endpoint.method,
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      };
      if (endpoint.requestExample && ["POST", "PATCH", "PUT"].includes(endpoint.method)) {
        opts.body = JSON.stringify(endpoint.requestExample);
      }
      // Replace path params with placeholder for test
      const url = endpoint.path.replace(/\{[^}]+\}/g, "00000000-0000-0000-0000-000000000001");
      const res = await fetch(url, opts);
      const json = await res.json();
      setTryResult(JSON.stringify(json, null, 2));
    } catch (err) {
      setTryResult(`Помилка: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setTrying(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-bold ${METHOD_COLORS[endpoint.method]}`}>
          {endpoint.method}
        </span>
        <code className="text-sm font-mono text-white">{endpoint.path}</code>
        <span className="ml-auto rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-400 border border-purple-500/20">
          {endpoint.permission}
        </span>
      </div>

      <p className="text-sm text-zinc-400">{endpoint.description}</p>

      <div className="flex items-center gap-2 text-[10px]">
        <span className={`rounded-full px-2 py-0.5 font-medium ${
          endpoint.direction === '1С → Сайт' ? 'bg-blue-500/10 text-blue-400' :
          endpoint.direction === 'Сайт → 1С' ? 'bg-amber-500/10 text-amber-400' :
          'bg-zinc-500/10 text-zinc-400'
        }`}>
          {endpoint.direction}
        </span>
      </div>

      {endpoint.notes && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
          <span className="text-xs text-amber-300">{endpoint.notes}</span>
        </div>
      )}

      {/* Path params */}
      {endpoint.pathParams && endpoint.pathParams.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-zinc-300">Параметри URL</h4>
          <FieldTable fields={endpoint.pathParams} />
        </div>
      )}

      {/* Query params */}
      {endpoint.queryParams && endpoint.queryParams.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-zinc-300">Query параметри</h4>
          <FieldTable fields={endpoint.queryParams} />
        </div>
      )}

      {/* Request fields */}
      {endpoint.requestFields && endpoint.requestFields.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-zinc-300">Тіло запиту (JSON)</h4>
          <FieldTable fields={endpoint.requestFields} />
        </div>
      )}

      {/* Code examples */}
      <div>
        <div className="flex items-center gap-1 mb-2">
          <Code2 className="h-3.5 w-3.5 text-zinc-500" />
          <h4 className="text-xs font-semibold text-zinc-300">Приклад коду</h4>
        </div>
        <div className="flex gap-1 mb-2">
          {(["curl", "js", "python", "1c"] as const).map(lang => (
            <button
              key={lang}
              onClick={() => setCodeLang(lang)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors ${
                codeLang === lang ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-zinc-500 hover:text-zinc-300 border border-transparent"
              }`}
            >
              {lang === "js" ? "JavaScript" : lang === "1c" ? "1С" : lang === "curl" ? "cURL" : "Python"}
            </button>
          ))}
        </div>
        <CodeBlock code={code} lang={codeLang} />
      </div>

      {/* Response example */}
      <div>
        <h4 className="mb-2 text-xs font-semibold text-zinc-300">Відповідь (200 OK)</h4>
        <CodeBlock code={JSON.stringify(endpoint.responseExample, null, 2)} lang="json" />
      </div>

      {/* Try button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleTry}
          disabled={trying}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 transition-colors"
        >
          {trying ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Play className="h-4 w-4" />}
          {trying ? "Виконується..." : "Спробувати"}
        </button>
        {!token && <span className="text-[10px] text-zinc-600">← Введіть API-токен зверху</span>}
      </div>

      {tryResult && (
        <div>
          <h4 className="mb-2 text-xs font-semibold text-zinc-300">Результат</h4>
          <CodeBlock code={tryResult} lang="json" />
        </div>
      )}
    </div>
  );
}

function FieldTable({ fields }: { fields: Array<{ name: string; type: string; required: boolean; description: string }> }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#1e1e2a]">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-[#111116] text-zinc-500">
            <th className="px-3 py-2 text-left font-medium">Поле</th>
            <th className="px-3 py-2 text-left font-medium">Тип</th>
            <th className="px-3 py-2 text-center font-medium w-8">*</th>
            <th className="px-3 py-2 text-left font-medium">Опис</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#1e1e2a]">
          {fields.map(f => (
            <tr key={f.name} className="hover:bg-white/[0.02]">
              <td className="px-3 py-1.5 font-mono text-white">{f.name}</td>
              <td className="px-3 py-1.5 text-zinc-500">{f.type}</td>
              <td className="px-3 py-1.5 text-center">{f.required ? <span className="text-red-400 font-bold">*</span> : ""}</td>
              <td className="px-3 py-1.5 text-zinc-400">{f.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ───

export default function ApiDocsPage() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<DocEndpoint>(API_DOCS[0].endpoints[0]);
  const [token, setToken] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-[calc(100vh-60px)] overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "w-64" : "w-0"} shrink-0 overflow-y-auto border-r border-[#1e1e2a] bg-[#0a0a0f] transition-all`}>
        <div className="p-4">
          <h2 className="mb-1 text-sm font-bold text-white">API Reference</h2>
          <p className="mb-4 text-[10px] text-zinc-600">v1 · REST · Bearer Auth</p>

          {/* Auth section */}
          <div className="mb-4">
            <label className="mb-1 block text-[10px] font-medium text-zinc-500">API ТОКЕН</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="sk_live_..."
              className="w-full rounded-md bg-[#111116] border border-[#1e1e2a] px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-700 focus:border-purple-500 focus:outline-none"
            />
          </div>

          {/* Navigation */}
          <nav className="space-y-3">
            {/* Quick links */}
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => setSelectedEndpoint(API_DOCS[0].endpoints[0])}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.03] hover:text-white transition-colors"
              >
                <Shield className="h-3.5 w-3.5 text-zinc-600" />
                Авторизація
              </button>
              <button
                onClick={() => {/* scroll to status codes */}}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-zinc-400 hover:bg-white/[0.03] hover:text-white transition-colors"
              >
                <Zap className="h-3.5 w-3.5 text-zinc-600" />
                Статус-коди
              </button>
            </div>

            <div className="border-t border-[#1e1e2a] pt-2" />

            {API_DOCS.map(group => (
              <SidebarGroup
                key={group.id}
                group={group}
                selectedId={selectedEndpoint.id}
                onSelect={setSelectedEndpoint}
              />
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[#1e1e2a] bg-[#0c0c12]/95 backdrop-blur px-6 py-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="rounded-md p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors">
            <ChevronRight className={`h-4 w-4 transition-transform ${sidebarOpen ? "rotate-180" : ""}`} />
          </button>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${METHOD_COLORS[selectedEndpoint.method]}`}>
              {selectedEndpoint.method}
            </span>
            <span className="text-sm font-medium text-white">{selectedEndpoint.summary}</span>
          </div>
          <code className="ml-auto hidden text-[11px] text-zinc-600 font-mono sm:block">{BASE_URL}{selectedEndpoint.path}</code>
        </div>

        <div className="mx-auto max-w-4xl px-6 py-8 space-y-10">
          <EndpointDetail endpoint={selectedEndpoint} token={token} />

          {/* Auth reference */}
          <div className="border-t border-[#1e1e2a] pt-8">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
              <Shield className="h-5 w-5 text-purple-400" />
              Авторизація
            </h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>Кожен запит має містити заголовок:</p>
              <CodeBlock code={'Authorization: Bearer sk_live_ваш_токен_тут\nContent-Type: application/json'} lang="http" />
              <p>Токен створюється в адмінці <code className="rounded bg-[#1a1a24] px-1.5 py-0.5 text-xs text-purple-300">/admin/api-keys</code></p>
              <p>Перевірити підключення: <code className="rounded bg-[#1a1a24] px-1.5 py-0.5 text-xs text-purple-300">GET /api/v1/health</code></p>
            </div>
          </div>

          {/* Pagination */}
          <div className="border-t border-[#1e1e2a] pt-8">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
              <ArrowRight className="h-5 w-5 text-purple-400" />
              Пагінація
            </h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>GET-запити підтримують параметри: <code className="rounded bg-[#1a1a24] px-1.5 py-0.5 text-xs text-zinc-300">?page=1&per_page=50</code></p>
              <p>Максимум: 500 записів на сторінку. Відповідь містить <code className="rounded bg-[#1a1a24] px-1.5 py-0.5 text-xs text-zinc-300">meta</code> з total, page, per_page, total_pages.</p>
            </div>
          </div>

          {/* Status codes */}
          <div className="border-t border-[#1e1e2a] pt-8">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
              <Zap className="h-5 w-5 text-purple-400" />
              Статус-коди
            </h3>
            <div className="overflow-x-auto rounded-lg border border-[#1e1e2a]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#111116] text-zinc-500">
                    <th className="px-3 py-2 text-left font-medium">Код</th>
                    <th className="px-3 py-2 text-left font-medium">Статус</th>
                    <th className="px-3 py-2 text-left font-medium">Опис</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e1e2a]">
                  {STATUS_CODES.map(sc => (
                    <tr key={sc.code} className="hover:bg-white/[0.02]">
                      <td className={`px-3 py-2 font-mono font-bold text-${sc.color}-400`}>{sc.code}</td>
                      <td className="px-3 py-2 text-zinc-300">{sc.label}</td>
                      <td className="px-3 py-2 text-zinc-500">{sc.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rate limiting */}
          <div className="border-t border-[#1e1e2a] pt-8 pb-16">
            <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
              <AlertTriangle className="h-5 w-5 text-purple-400" />
              Rate Limiting
            </h3>
            <div className="space-y-3 text-sm text-zinc-400">
              <p>Ліміт визначається для кожного токена окремо (10/30/60/100/300 запитів на хвилину).</p>
              <p>Заголовки відповіді: <code className="rounded bg-[#1a1a24] px-1.5 py-0.5 text-xs text-zinc-300">X-RateLimit-Limit</code>, <code className="rounded bg-[#1a1a24] px-1.5 py-0.5 text-xs text-zinc-300">X-RateLimit-Remaining</code></p>
              <p>При перевищенні: HTTP 429 + заголовок <code className="rounded bg-[#1a1a24] px-1.5 py-0.5 text-xs text-zinc-300">Retry-After</code> (секунди до наступної можливої спроби).</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SidebarGroup({ group, selectedId, onSelect }: { group: DocGroup; selectedId: string; onSelect: (e: DocEndpoint) => void }) {
  const Icon = ICON_MAP[group.icon] || Package;
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 px-2">
        <Icon className="h-3 w-3 text-zinc-600" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{group.label}</span>
      </div>
      <div className="flex flex-col">
        {group.endpoints.map(ep => (
          <button
            key={ep.id}
            onClick={() => onSelect(ep)}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-[11px] transition-colors ${
              selectedId === ep.id ? "bg-purple-500/10 text-purple-300" : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-300"
            }`}
          >
            <span className={`w-10 shrink-0 rounded text-center text-[8px] font-bold py-0.5 ${METHOD_COLORS[ep.method]}`}>{ep.method}</span>
            <span className="truncate">{ep.summary}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
