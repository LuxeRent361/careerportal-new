
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type HistoryItem = {
  id: string;
  status: string | null;
  source_code?: string | null;
  source_name?: string | null;
  found?: number | null;
  created?: number | null;
  failed?: number | null;
  started_at?: string | null;
  created_at?: string | null;
  error_message?: string | null;
};

export default async function MonitoringHistoryPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/sources/history");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("source_import_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Record<string, unknown>[];

  const history: HistoryItem[] = rows.map((row) => ({
    id: String(row.id ?? ""),
    status: row.status == null ? null : String(row.status),
    source_code:
      row.source_code == null ? null : String(row.source_code),
    source_name:
      row.source_name == null ? null : String(row.source_name),
    found: toNumber(row.found),
    created: toNumber(row.created),
    failed: toNumber(row.failed),
    started_at:
      row.started_at == null ? null : String(row.started_at),
    created_at:
      row.created_at == null ? null : String(row.created_at),
    error_message:
      row.error_message == null ? null : String(row.error_message),
  }));

  const successCount = history.filter(
    (item) => normalizeStatus(item.status) === "success"
  ).length;

  const failedCount = history.filter(
    (item) => ["failed", "error"].includes(normalizeStatus(item.status))
  ).length;

  const runningCount = history.filter(
    (item) => normalizeStatus(item.status) === "running"
  ).length;

  const totalFound = history.reduce(
    (sum, item) => sum + (item.found ?? 0),
    0
  );

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-1 sm:space-y-8">
      <header className="overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-purple-100 p-5 shadow-sm dark:border-violet-900 dark:from-[#21172f] dark:via-[#171121] dark:to-[#2c1d42] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-800 dark:bg-white/5 dark:text-violet-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
              Automation Center
            </span>

            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Monitoring History
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Track previous source checks, imported records, failures
              and the latest monitoring activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/sources"
              className="inline-flex items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-800 transition hover:border-violet-400 hover:bg-violet-50 dark:border-violet-800 dark:bg-white/5 dark:text-violet-200 dark:hover:bg-white/10"
            >
              ← Source Monitoring
            </Link>

            <Link
              href="/admin/import-queue"
              className="inline-flex items-center justify-center rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-800"
            >
              Import Queue →
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
          <h2 className="font-extrabold text-red-800 dark:text-red-300">
            Unable to load monitoring history
          </h2>
          <p className="mt-2 break-words text-sm leading-6 text-red-700 dark:text-red-200">
            {error.message}
          </p>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Runs"
          value={history.length}
          icon="📊"
          tone="violet"
        />
        <StatCard
          label="Successful"
          value={successCount}
          icon="✓"
          tone="green"
        />
        <StatCard
          label="Failed"
          value={failedCount}
          icon="!"
          tone="red"
        />
        <StatCard
          label="Records Found"
          value={totalFound}
          icon="📥"
          tone="purple"
        />
      </section>

      <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900 dark:bg-[#1d1729] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Monitoring Overview
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Summary of the latest stored monitoring activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill label="Success" value={successCount} type="success" />
            <StatusPill label="Failed" value={failedCount} type="failed" />
            <StatusPill label="Running" value={runningCount} type="running" />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm dark:border-violet-900 dark:bg-[#1d1729]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 px-5 py-4 dark:border-violet-900 sm:px-6">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Recent Monitoring Runs
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Latest 200 monitoring records.
            </p>
          </div>

          <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-extrabold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            {history.length} runs
          </span>
        </div>

        {history.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-3xl dark:bg-violet-950">
              📊
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
              No monitoring history yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              Run a source check from Source Monitoring. Recorded
              monitoring activity will appear here.
            </p>
            <Link
              href="/admin/sources"
              className="mt-5 inline-flex rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-800"
            >
              Go to Source Monitoring
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[950px] text-left">
                <thead>
                  <tr className="border-b border-violet-100 bg-violet-50/70 dark:border-violet-900 dark:bg-white/[0.03]">
                    {["Date", "Source", "Status", "Found", "Created", "Failed", "Details"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-5 py-4 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-violet-50 dark:divide-violet-900/70">
                  {history.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-violet-50/60 dark:hover:bg-white/[0.03]"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {formatDate(item.started_at || item.created_at || null)}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-extrabold text-slate-900 dark:text-white">
                          {item.source_name || item.source_code || "Unknown Source"}
                        </p>
                        {item.source_code && (
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                            {item.source_code}
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="px-5 py-4 text-sm font-extrabold text-slate-700 dark:text-slate-200">
                        {item.found ?? 0}
                      </td>

                      <td className="px-5 py-4 text-sm font-extrabold text-emerald-700 dark:text-emerald-400">
                        {item.created ?? 0}
                      </td>

                      <td className="px-5 py-4 text-sm font-extrabold text-red-600 dark:text-red-400">
                        {item.failed ?? 0}
                      </td>

                      <td className="max-w-[280px] px-5 py-4">
                        {item.error_message ? (
                          <p className="break-words text-xs leading-5 text-red-600 dark:text-red-300">
                            {item.error_message}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            No error reported.
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-violet-100 dark:divide-violet-900 md:hidden">
              {history.map((item) => (
                <article key={item.id} className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-black text-slate-900 dark:text-white">
                        {item.source_name || item.source_code || "Unknown Source"}
                      </h3>
                      {item.source_code && (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
                          {item.source_code}
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        {formatDate(item.started_at || item.created_at || null)}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MiniStat label="Found" value={item.found ?? 0} />
                    <MiniStat label="Created" value={item.created ?? 0} />
                    <MiniStat label="Failed" value={item.failed ?? 0} />
                  </div>

                  {item.error_message && (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/30">
                      <p className="break-words text-xs leading-5 text-red-700 dark:text-red-300">
                        {item.error_message}
                      </p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeStatus(value: string | null) {
  return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function StatusBadge({ status }: { status: string | null }) {
  const normalized = normalizeStatus(status);

  const styles: Record<string, string> = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
    failed:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
    error:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
    running:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  };

  const label =
    normalized === "error"
      ? "FAILED"
      : (status || "UNKNOWN").replace(/[_-]+/g, " ").toUpperCase();

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide ${
        styles[normalized] ??
        "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200"
      }`}
    >
      {label}
    </span>
  );
}

function StatusPill({
  label,
  value,
  type,
}: {
  label: string;
  value: number;
  type: "success" | "failed" | "running";
}) {
  const styles = {
    success:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
    failed:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
    running:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  };

  return (
    <span className={`rounded-full border px-3 py-2 text-xs font-extrabold ${styles[type]}`}>
      {label}: {value}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3 text-center dark:border-violet-900 dark:bg-white/[0.03]">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone: "violet" | "green" | "red" | "purple";
}) {
  const tones = {
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    red:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
    purple:
      "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-300",
  };

  return (
    <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-violet-900 dark:bg-[#1d1729]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg ${tones[tone]}`}>
          {icon}
        </span>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
        {value.toLocaleString("en-IN")}
      </p>
    </article>
  );
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}