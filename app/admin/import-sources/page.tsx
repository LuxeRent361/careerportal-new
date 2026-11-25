
"use client";

import { useCallback, useEffect, useState } from "react";

type Source = {
  id: string;
  institution_name: string;
  sector: string;
  source_name: string;
  official_url: string;
  content_type: string;
  is_active: boolean;
  last_checked_at: string | null;
  last_status: string | null;
  last_error: string | null;
};

type ScanResult = {
  success?: boolean;
  message?: string;
  error?: string;
  source?: string;
  found_count?: number;
  imported_count?: number;
  duplicate_count?: number;
};

export default function ImportSourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingId, setCheckingId] = useState("");
  const [checkingAll, setCheckingAll] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<Record<string, ScanResult>>({});

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/import-sources", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Sources load नहीं हो पाए।");
      }

      setSources(data.sources || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Sources load नहीं हो पाए।"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  async function checkSource(source: Source) {
    if (!source.is_active || checkingId || checkingAll) return;

    setCheckingId(source.id);
    setNotice(`${source.source_name} चेक हो रहा है...`);
    setError("");
    setResults((current) => {
      const next = { ...current };
      delete next[source.id];
      return next;
    });

    try {
      const response = await fetch("/api/admin/import-sources/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_id: source.id }),
        cache: "no-store",
      });

      const data: ScanResult = await response.json();

      setResults((current) => ({ ...current, [source.id]: data }));

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Source check असफल रहा।");
      }

      setNotice(`${source.source_name} की जाँच पूरी हुई।`);
      await loadSources();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Source check असफल रहा।"
      );
    } finally {
      setCheckingId("");
    }
  }

  async function checkAllSources() {
    if (checkingId || checkingAll) return;

    const activeSources = sources.filter((source) => source.is_active);

    if (!activeSources.length) {
      setError("कोई active source उपलब्ध नहीं है।");
      return;
    }

    setCheckingAll(true);
    setNotice("");
    setError("");

    const nextResults: Record<string, ScanResult> = {};

    try {
      for (const source of activeSources) {
        setNotice(`${source.source_name} चेक हो रहा है...`);

        try {
          const response = await fetch("/api/admin/import-sources/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source_id: source.id }),
            cache: "no-store",
          });

          const data: ScanResult = await response.json();
          nextResults[source.id] = data;

          setResults({ ...nextResults });

          if (!response.ok || !data.success) {
            nextResults[source.id] = {
              ...data,
              error: data.error || "Source check असफल रहा।",
            };
            setResults({ ...nextResults });
          }
        } catch (err) {
          nextResults[source.id] = {
            success: false,
            error:
              err instanceof Error ? err.message : "Request असफल रहा।",
          };
          setResults({ ...nextResults });
        }
      }

      const successful = Object.values(nextResults).filter(
        (result) => result.success
      ).length;

      setNotice(
        `जाँच पूरी: ${successful} सफल, ${
          activeSources.length - successful
        } असफल।`
      );

      await loadSources();
    } finally {
      setCheckingAll(false);
    }
  }

  const activeCount = sources.filter((source) => source.is_active).length;

  return (
    <main className="min-h-screen bg-[#f5f7fb] px-4 py-8 text-[#172033] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold text-blue-700">
              CAREERPORTAL ADMIN
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Official Source Monitor
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              सरकारी वेबसाइटों से नोटिस ढूँढें और Import Queue में भेजें।
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/admin"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
            >
              ← Admin Dashboard
            </a>
            <button
              onClick={() => void loadSources()}
              disabled={loading || checkingAll || Boolean(checkingId)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold disabled:opacity-50"
            >
              Refresh
            </button>
            <button
              onClick={() => void checkAllSources()}
              disabled={loading || checkingAll || Boolean(checkingId) || !activeCount}
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {checkingAll ? "Checking..." : "Check All Sources"}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Total Sources</p>
            <p className="mt-2 text-3xl font-bold">{sources.length}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Active Sources</p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {activeCount}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Results This Session</p>
            <p className="mt-2 text-3xl font-bold">
              {Object.values(results).filter((item) => item.success).length}
            </p>
          </div>
        </div>

        {notice && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            {notice}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold">Saved Official Sources</h2>
            <p className="mt-1 text-sm text-slate-500">
              प्रत्येक source को अलग चेक कर सकते हो।
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-600">Sources लोड हो रहे हैं...</p>
          ) : sources.length === 0 ? (
            <p className="p-6 text-sm text-slate-600">
              अभी कोई source सेव नहीं है।
            </p>
          ) : (
            <div className="divide-y divide-slate-200">
              {sources.map((source) => {
                const result = results[source.id];
                const isChecking = checkingId === source.id;

                return (
                  <article key={source.id} className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-bold">
                            {source.institution_name}
                          </h3>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              source.is_active
                                ? "bg-green-100 text-green-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {source.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>

                        <p className="mt-1 text-sm text-slate-600">
                          {source.source_name}
                        </p>

                        <a
                          href={source.official_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 inline-block break-all text-sm text-blue-700 underline"
                        >
                          {source.official_url}
                        </a>

                        <p className="mt-2 text-xs text-slate-500">
                          Sector: {source.sector} · Type: {source.content_type}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Last checked:{" "}
                          {source.last_checked_at
                            ? new Date(source.last_checked_at).toLocaleString()
                            : "अभी तक चेक नहीं हुआ"}
                        </p>

                        {source.last_error && (
                          <p className="mt-2 break-words text-sm text-red-700">
                            पिछली error: {source.last_error}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => void checkSource(source)}
                        disabled={
                          !source.is_active ||
                          Boolean(checkingId) ||
                          checkingAll
                        }
                        className="shrink-0 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isChecking ? "Checking..." : "Check Official Source"}
                      </button>
                    </div>

                    {result && (
                      <div
                        className={`mt-4 rounded-xl border p-4 ${
                          result.success
                            ? "border-green-200 bg-green-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <p className="font-semibold">
                          {result.success ? "Scan completed" : "Scan failed"}
                        </p>

                        {result.success ? (
                          <div className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                            <p>
                              <strong>Found:</strong> {result.found_count ?? 0}
                            </p>
                            <p>
                              <strong>New:</strong> {result.imported_count ?? 0}
                            </p>
                            <p>
                              <strong>Duplicates:</strong>{" "}
                              {result.duplicate_count ?? 0}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 break-words text-sm text-red-800">
                            {result.error || "Unknown error"}
                          </p>
                        )}

                        {result.success && (
                          <p className="mt-2 text-xs text-slate-600">
                            नए नोटिस Import Queue में review के लिए रहेंगे;
                            अपने-आप publish नहीं होंगे।
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-6 text-slate-500">
          नोट: यह शुरुआती scanner है। JavaScript-आधारित वेबसाइटों या blocked
          requests पर अलग extraction method की जरूरत हो सकती है। अभी यह
          discovery और duplicate check करता है, पूरी भर्ती की सभी details
          निकालने का दावा नहीं करता।
        </p>
      </div>
    </main>
  );
}
