"use client";

import { useState } from "react";

type Summary = { source: string; found: number; created: number; duplicates: number; errors: string[] };
type Result = { success?: boolean; message?: string; error?: string; sourcesChecked?: number; found?: number; created?: number; duplicates?: number; summary?: Summary[] };

export default function OfficialMonitorPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  async function scanAll() {
    setLoading(true); setResult(null); setError("");
    try {
      const response = await fetch("/api/admin/sources/check", {
        method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => ({}))) as Result;
      if (!response.ok || !data.success) throw new Error(data.error || data.message || `Monitor failed (HTTP ${response.status}).`);
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Official sources scan failed."); }
    finally { setLoading(false); }
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8">
      <div className="rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-blue-50 to-indigo-50 p-6 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">CareerPortal · Official-source automation</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Official Notice Monitor</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">एक बार में सभी active configured official sources scan करें। Relevant job, exam, result, admit card, answer key, syllabus, admission और जरूरी notice अलग-अलग queue records में आएँगे। Homepage और generic links को notice की तरह import करने से बचने के लिए relevance filters लागू हैं।</p>
        <button type="button" onClick={scanAll} disabled={loading} className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-700 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? "Official sources scan हो रहे हैं…" : "Scan All Active Official Sources"}
        </button>
        <p className="mt-3 text-xs leading-5 text-slate-500">नोट: Source blocked हो या scanned PDF हो तो error दर्ज होगा; अनुमान लगाकर missing detail नहीं भरी जाएगी। Publish से पहले review जरूरी है।</p>
      </div>

      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}
      {result && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[["Sources checked", result.sourcesChecked ?? 0], ["Notice links found", result.found ?? 0], ["New queue records", result.created ?? 0], ["Duplicates skipped", result.duplicates ?? 0]].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-black text-slate-900">Source-by-source report</h2><p className="mt-1 text-xs text-slate-500">Queue records remain pending; nothing was auto-published.</p></div>
          <div className="divide-y divide-slate-100">
            {(result.summary || []).map((row) => <div key={row.source} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-start">
              <div><p className="font-extrabold text-slate-900">{row.source}</p>{row.errors.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-700">{row.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}</div>
              <div className="flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-800">Found {row.found}</span><span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">Added {row.created}</span><span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Duplicate {row.duplicates}</span></div>
            </div>)}
          </div>
        </div>
        <a href="/admin/import-queue" className="inline-flex rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-extrabold text-blue-800 hover:bg-blue-50">Open Import Queue →</a>
      </>}
    </main>
  );
}
