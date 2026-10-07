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

  /*
   * We intentionally read the existing source_import_runs table
   * without assuming unsupported columns.
   *
   * If some optional columns do not exist, the page will show
   * a clear database message instead of crashing silently.
   */

  const { data, error } = await supabase
    .from("source_import_runs")
    .select("*")
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  const rows = (data ?? []) as Record<string, unknown>[];

  const history: HistoryItem[] = rows.map((row) => ({
    id: String(row.id ?? ""),
    status:
      row.status !== undefined && row.status !== null
        ? String(row.status)
        : null,

    source_code:
      row.source_code !== undefined &&
      row.source_code !== null
        ? String(row.source_code)
        : null,

    source_name:
      row.source_name !== undefined &&
      row.source_name !== null
        ? String(row.source_name)
        : null,

    found: toNumber(row.found),
    created: toNumber(row.created),
    failed: toNumber(row.failed),

    started_at:
      row.started_at !== undefined &&
      row.started_at !== null
        ? String(row.started_at)
        : null,

    created_at:
      row.created_at !== undefined &&
      row.created_at !== null
        ? String(row.created_at)
        : null,

    error_message:
      row.error_message !== undefined &&
      row.error_message !== null
        ? String(row.error_message)
        : null,
  }));

  const successCount = history.filter(
    (item) =>
      normalizeStatus(item.status) === "success"
  ).length;

  const failedCount = history.filter(
    (item) =>
      normalizeStatus(item.status) === "failed"
  ).length;

  const runningCount = history.filter(
    (item) =>
      normalizeStatus(item.status) === "running"
  ).length;

  const totalFound = history.reduce(
    (sum, item) => sum + (item.found ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Automation
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Monitoring History
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            View previous source monitoring runs, their status and
            discovered records.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/sources"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
          >
            ← Source Monitoring
          </Link>

          <Link
            href="/admin/import-queue"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-700"
          >
            Import Queue →
          </Link>
        </div>
      </div>

      {/* Database error */}
      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg">
              ⚠️
            </div>

            <div>
              <h2 className="text-sm font-extrabold text-red-800">
                Unable to load monitoring history
              </h2>

              <p className="mt-1 text-xs leading-5 text-red-700">
                {error.message}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Runs"
          value={history.length}
          icon="📊"
        />

        <StatCard
          label="Successful"
          value={successCount}
          icon="✓"
        />

        <StatCard
          label="Failed"
          value={failedCount}
          icon="!"
        />

        <StatCard
          label="Records Found"
          value={totalFound}
          icon="📥"
        />
      </div>

      {/* Status summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Monitoring Overview
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Summary of the latest stored monitoring activity.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill
              label="Success"
              value={successCount}
              type="success"
            />

            <StatusPill
              label="Failed"
              value={failedCount}
              type="failed"
            />

            <StatusPill
              label="Running"
              value={runningCount}
              type="running"
            />
          </div>
        </div>
      </section>

      {/* History table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Recent Monitoring Runs
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest 200 monitoring records.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
              {history.length} runs
            </span>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              📊
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No monitoring history yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Run a source check from Source Monitoring and its
              monitoring activity will appear here when recorded.
            </p>

            <Link
              href="/admin/sources"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Go to Source Monitoring
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Source
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Found
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Created
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Failed
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {history.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(
                          item.started_at ??
                            item.created_at ??
                            null
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-xs font-extrabold text-slate-800">
                            {item.source_name ||
                              item.source_code ||
                              "Unknown Source"}
                          </p>

                          {item.source_code ? (
                            <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                              {item.source_code}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={item.status}
                        />
                      </td>

                      <td className="px-5 py-4 text-xs font-extrabold text-slate-700">
                        {item.found ?? 0}
                      </td>

                      <td className="px-5 py-4 text-xs font-extrabold text-emerald-700">
                        {item.created ?? 0}
                      </td>

                      <td className="px-5 py-4 text-xs font-extrabold text-red-600">
                        {item.failed ?? 0}
                      </td>

                      <td className="max-w-[260px] px-5 py-4">
                        {item.error_message ? (
                          <p className="text-xs leading-5 text-red-600">
                            {item.error_message}
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">
                            No error reported.
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-800">
                        {item.source_name ||
                          item.source_code ||
                          "Unknown Source"}
                      </p>

                      {item.source_code ? (
                        <p className="mt-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-600">
                          {item.source_code}
                        </p>
                      ) : null}

                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        {formatDate(
                          item.started_at ||
                            item.created_at
                        )}
                      </p>
                    </div>

                    <StatusBadge
                      status={item.status}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <MiniStat
                      label="Found"
                      value={item.found ?? 0}
                    />

                    <MiniStat
                      label="Created"
                      value={item.created ?? 0}
                    />

                    <MiniStat
                      label="Failed"
                      value={item.failed ?? 0}
                    />
                  </div>

                  {item.error_message ? (
                    <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
                      <p className="text-xs leading-5 text-red-700">
                        {item.error_message}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function toNumber(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function normalizeStatus(
  value: string | null
) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function StatusBadge({
  status,
}: {
  status: string | null;
}) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "success") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-700">
        SUCCESS
      </span>
    );
  }

  if (normalized === "failed" || normalized === "error") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-red-700">
        FAILED
      </span>
    );
  }

  if (normalized === "running") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-700">
        RUNNING
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-600">
      {status || "UNKNOWN"}
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
      "bg-emerald-50 text-emerald-700",
    failed:
      "bg-red-50 text-red-700",
    running:
      "bg-amber-50 text-amber-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-2 text-xs font-extrabold ${styles[type]}`}
    >
      {label}: {value}
    </span>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-extrabold text-slate-800">
        {value}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-lg">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-2xl font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date unavailable";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}