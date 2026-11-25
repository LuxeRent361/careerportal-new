
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type QueueItem = {
  id: string;
  title: string | null;
  institution_name: string | null;
  content_type: string | null;
  official_url: string | null;
  notification_url: string | null;
  pdf_url: string | null;
  status: string | null;
  raw_content: string | null;
  extracted_data: Record<string, unknown> | null;
  created_at?: string;
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  checking: "bg-blue-100 text-blue-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  published: "bg-purple-100 text-purple-800",
  duplicate: "bg-slate-200 text-slate-700",
  failed: "bg-red-100 text-red-800",
};

export default function ImportQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/import-queue", {
        cache: "no-store",
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Queue load nahi hui.");
      }

      setItems(Array.isArray(result.items) ? result.items : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Queue load nahi hui."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function updateItem(id: string, action: "approve" | "reject") {
    const confirmation =
      action === "approve"
        ? "Is notice ko review ke liye approve karein? Yeh publish nahi hoga."
        : "Kya aap is notice ko reject karna chahte hain?";

    if (!window.confirm(confirmation)) return;

    setWorkingId(id);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/import-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Status update nahi hua.");
      }

      setMessage(result.message || "Status update ho gaya.");
      await loadItems();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Status update nahi hua."
      );
    } finally {
      setWorkingId("");
    }
  }

  const visibleItems =
    filter === "all"
      ? items
      : items.filter((item) => item.status === filter);

  const pendingCount = items.filter(
    (item) => item.status === "pending"
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-blue-600">
            OFFICIAL SOURCE SYSTEM
          </p>
          <h1 className="mt-1 text-3xl font-extrabold text-slate-900">
            Import Queue
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Official sources se mile notices ko check aur review karein.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/import-sources"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Official Sources
          </Link>
          <button
            onClick={() => void loadItems()}
            disabled={loading}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh Queue"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-500">Total loaded</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">
            {items.length}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-800">Pending review</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-900">
            {pendingCount}
          </p>
        </div>
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-semibold text-green-800">Approved</p>
          <p className="mt-2 text-3xl font-extrabold text-green-900">
            {items.filter((item) => item.status === "approved").length}
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-800">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <label
          htmlFor="queue-filter"
          className="text-sm font-bold text-slate-700"
        >
          Filter by status
        </label>
        <select
          id="queue-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="checking">Checking</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="published">Published</option>
          <option value="duplicate">Duplicate</option>
          <option value="failed">Failed</option>
        </select>
        <span className="text-sm text-slate-500">
          Showing {visibleItems.length} item(s)
        </span>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Queue load ho rahi hai...
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-lg font-bold text-slate-800">
            Is filter mein koi notice nahi mila
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Official Sources page par jaakar source scan karein, phir yahan
            Refresh Queue dabayein.
          </p>
          <Link
            href="/admin/import-sources"
            className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            Open Official Sources
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {visibleItems.map((item) => {
            const status = item.status || "pending";
            const details = item.extracted_data || {};
            const detailsExtracted = details.details_extracted === true;
            const sourceUrl =
              item.notification_url || item.official_url || "";

            return (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-extrabold ${
                          statusStyles[status] ||
                          "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {status.toUpperCase()}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                        {(item.content_type || "unknown").replaceAll("_", " ")}
                      </span>
                    </div>

                    <h2 className="mt-3 break-words text-lg font-extrabold text-slate-900">
                      {item.title || "Untitled notice"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.institution_name || "Institution not specified"}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-start gap-2">
                    {sourceUrl && (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                      >
                        Open Official Link ↗
                      </a>
                    )}
                    {item.pdf_url && (
                      <a
                        href={item.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
                      >
                        Open PDF
                      </a>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">
                    Extraction status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {detailsExtracted
                      ? "Details marked as extracted"
                      : "Only link/title discovered — full details not extracted"}
                  </p>
                  {item.raw_content && (
                    <p className="mt-2 break-words text-sm text-slate-600">
                      {item.raw_content}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {status !== "published" && status !== "rejected" && (
                    <>
                      <button
                        onClick={() => void updateItem(item.id, "approve")}
                        disabled={workingId === item.id || status === "approved"}
                        className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {workingId === item.id
                          ? "Saving..."
                          : status === "approved"
                            ? "Approved for Review"
                            : "Approve for Review"}
                      </button>
                      <button
                        onClick={() => void updateItem(item.id, "reject")}
                        disabled={workingId === item.id}
                        className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {status === "rejected" && (
                    <span className="text-sm font-semibold text-red-700">
                      This notice has been rejected.
                    </span>
                  )}

                  {status === "published" && (
                    <span className="text-sm font-semibold text-purple-700">
                      This notice is marked as published.
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-5 text-slate-500">
        Important: Approve for Review sirf queue status badalta hai. Yeh action
        public website par notice publish nahi karta. Full details verify karna
        abhi bhi zaroori hai.
      </p>
    </div>
  );
}
