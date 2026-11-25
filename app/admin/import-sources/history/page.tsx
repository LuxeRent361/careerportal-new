
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type RunRecord = {
  id?: string | number;
  source_id?: string | number;
  source_name?: string;
  source_url?: string | null;
  status?: string;
  created_at?: string;
  started_at?: string;
  finished_at?: string;
  found_count?: number;
  new_count?: number;
  duplicate_count?: number;
  error_count?: number;
  error_message?: string | null;
  [key: string]: unknown;
};

function formatDate(value: unknown) {
  if (!value || typeof value !== "string") return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN");
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    const number = Number(value);
    if (value !== null && value !== undefined && value !== "" &&
        Number.isFinite(number)) {
      return number;
    }
  }
  return 0;
}

export default function MonitoringHistoryPage() {
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/import-sources/history", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "History load nahi hui.");
      }

      setRuns(Array.isArray(result.runs) ? result.runs : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "History load nahi hui."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const totalFound = runs.reduce(
    (sum, run) =>
      sum + numberValue(run.found_count, run.total_found, run.found),
    0
  );

  const totalNew = runs.reduce(
    (sum, run) =>
      sum + numberValue(run.new_count, run.created_count, run.created),
    0
  );

  const totalDuplicates = runs.reduce(
    (sum, run) =>
      sum + numberValue(
        run.duplicate_count,
        run.duplicates_count,
        run.duplicates
      ),
    0
  );

  return (
    <main className="min-h-screen bg-[#f5f7fb] p-4 text-[#172033] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-sm font-bold text-blue-600">
              AUTOMATION / HISTORY
            </p>
            <h1 className="text-2xl font-black sm:text-3xl">
              Monitoring History
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Official source scans aur unke saved results ka record.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => void loadHistory()}
              disabled={loading}
              className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh History"}
            </button>
            <Link
              href="/admin/import-sources"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50"
            >
              Source Monitoring
            </Link>
            <Link
              href="/admin/import-queue"
              className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold hover:bg-slate-50"
            >
              Import Queue
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Saved scan records", value: runs.length },
            { label: "Notices found", value: totalFound },
            { label: "New notices", value: totalNew },
            { label: "Duplicates", value: totalDuplicates },
          ].map((item) => (
            <section
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-black">{item.value}</p>
            </section>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-bold">History load nahi ho saki</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <h2 className="text-lg font-extrabold">Recent Scan Records</h2>
            <p className="mt-1 text-sm text-slate-500">
              यह सूची database में पहले से सेव हुए scan records दिखाती है।
            </p>
          </div>

          {loading ? (
            <p className="p-6 text-sm text-slate-500">
              History load ho rahi hai...
            </p>
          ) : runs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="font-bold">अभी कोई scan record नहीं मिला।</p>
              <p className="mt-2 text-sm text-slate-500">
                Source Monitoring से scan चलने और record save होने के बाद
                यहाँ इतिहास दिखाई देगा।
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="p-4 font-bold">Source</th>
                    <th className="p-4 font-bold">Started / Created</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Found</th>
                    <th className="p-4 font-bold">New</th>
                    <th className="p-4 font-bold">Duplicates</th>
                    <th className="p-4 font-bold">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {runs.map((run, index) => (
                    <tr key={String(run.id ?? index)} className="align-top">
                      <td className="p-4">
                        <p className="font-bold">
                          {run.source_name || "Unknown source"}
                        </p>
                        {run.source_url && (
                          <a
                            href={String(run.source_url)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block max-w-xs break-all text-xs text-blue-600 hover:underline"
                          >
                            Official source
                          </a>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">
                        {formatDate(run.started_at ?? run.created_at)}
                      </td>
                      <td className="p-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">
                          {String(run.status ?? "unknown")}
                        </span>
                      </td>
                      <td className="p-4">
                        {numberValue(run.found_count, run.total_found, run.found)}
                      </td>
                      <td className="p-4 font-bold text-green-700">
                        {numberValue(run.new_count, run.created_count, run.created)}
                      </td>
                      <td className="p-4">
                        {numberValue(
                          run.duplicate_count,
                          run.duplicates_count,
                          run.duplicates
                        )}
                      </td>
                      <td className="max-w-xs whitespace-normal p-4 text-red-600">
                        {String(run.error_message ?? "—")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
