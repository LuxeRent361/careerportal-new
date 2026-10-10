
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

type QueueItem = {
  id: string;
  title: string;
  source: string;
  content_type: string;
  category: string;
  status: string;
  created_at: string | null;
};

export default async function ImportQueuePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/import-queue");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("content_import_queue")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as Record<string, unknown>[];

  const queue: QueueItem[] = rows.map((row) => ({
    id: String(row.id ?? ""),
    title: getString(row, ["title", "name", "content_title"], "Untitled item"),
    source: getString(
      row,
      ["source_name", "source", "source_code", "source_url"],
      "Unknown source"
    ),
    content_type: getString(
      row,
      ["content_type", "type", "item_type"],
      "notification"
    ),
    category: getString(
      row,
      ["category", "category_name", "organization"],
      "General"
    ),
    status: getString(row, ["status", "state"], "pending"),
    created_at: getString(row, ["created_at", "created_on"], ""),
  }));

  const countStatus = (status: string) =>
    queue.filter((item) => normalizeStatus(item.status) === status).length;

  const pending = countStatus("pending");
  const approved = countStatus("approved");
  const published = countStatus("published");
  const rejected = countStatus("rejected");
  const duplicates = countStatus("duplicate");

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-1 sm:space-y-8">
      <header className="overflow-hidden rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-purple-100 p-5 shadow-sm dark:border-violet-900 dark:from-[#21172f] dark:via-[#171121] dark:to-[#2c1d42] sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.16em] text-violet-700 dark:border-violet-800 dark:bg-white/5 dark:text-violet-300">
              <span className="h-2 w-2 animate-pulse rounded-full bg-violet-500" />
              Content Automation
            </span>

            <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
              Import Queue
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Review imported jobs, exams, results and notices before
              approving or rejecting them. Check each record before publication.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/sources"
              className="inline-flex items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-3 text-sm font-bold text-violet-800 transition hover:bg-violet-50 dark:border-violet-800 dark:bg-white/5 dark:text-violet-200 dark:hover:bg-white/10"
            >
              ← Sources
            </Link>

            <Link
              href="/admin/sources/history"
              className="inline-flex items-center justify-center rounded-xl bg-violet-700 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-violet-700/20 transition hover:bg-violet-800"
            >
              Monitoring History →
            </Link>
          </div>
        </div>
      </header>

      {error && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900 dark:bg-red-950/30">
          <h2 className="font-extrabold text-red-800 dark:text-red-300">
            Unable to load Import Queue
          </h2>
          <p className="mt-2 break-words text-sm leading-6 text-red-700 dark:text-red-200">
            {error.message}
          </p>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total Items" value={queue.length} icon="📦" tone="violet" />
        <StatCard label="Pending Review" value={pending} icon="⏳" tone="amber" />
        <StatCard label="Approved" value={approved} icon="✓" tone="green" />
        <StatCard label="Published" value={published} icon="🚀" tone="blue" />
        <StatCard label="Rejected" value={rejected} icon="✕" tone="red" />
      </section>

      <section className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm dark:border-violet-900 dark:bg-[#1d1729] sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Content Workflow
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Review each imported record before publishing it.
            </p>
          </div>

          <span className="w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-extrabold text-violet-800 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200">
            {duplicates} possible duplicates
          </span>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <WorkflowStep
            number="01"
            title="Source"
            description="Collect information from configured sources."
            color="violet"
          />
          <WorkflowStep
            number="02"
            title="Review"
            description="Check details, dates and official links."
            color="blue"
          />
          <WorkflowStep
            number="03"
            title="Approve"
            description="Approve valid content or reject incorrect items."
            color="amber"
          />
          <WorkflowStep
            number="04"
            title="Publish"
            description="Publish only after the required checks."
            color="green"
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm dark:border-violet-900 dark:bg-[#1d1729]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 px-5 py-4 dark:border-violet-900 sm:px-6">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Imported Content
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Review the records stored in the import queue.
            </p>
          </div>

          <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-extrabold text-violet-800 dark:bg-violet-950 dark:text-violet-200">
            {queue.length} records
          </span>
        </div>

        {queue.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-3xl dark:bg-violet-950">
              📥
            </div>
            <h3 className="mt-4 text-lg font-black text-slate-900 dark:text-white">
              Import queue is empty
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
              When records are added to the import queue, they will appear here
              for review.
            </p>
            <Link
              href="/admin/sources"
              className="mt-5 inline-flex rounded-xl bg-violet-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet-800"
            >
              Open Source Monitoring
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-violet-100 bg-violet-50/70 dark:border-violet-900 dark:bg-white/[0.03]">
                    {["Content", "Type / Category", "Status", "Imported", "Action"].map(
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
                  {queue.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-violet-50/60 dark:hover:bg-white/[0.03]"
                    >
                      <td className="max-w-[360px] px-5 py-4">
                        <p className="break-words text-sm font-extrabold text-slate-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
                          Source: {item.source}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          {formatLabel(item.content_type)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {item.category}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} />
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {formatDate(item.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/import-queue/review/${encodeURIComponent(item.id)}`}
                          className="inline-flex items-center justify-center rounded-xl bg-violet-700 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-violet-800"
                        >
                          Review →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-violet-100 dark:divide-violet-900 md:hidden">
              {queue.map((item) => (
                <article key={item.id} className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-black text-slate-900 dark:text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">
                        Source: {item.source}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3 dark:border-violet-900 dark:bg-white/[0.03]">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Content Type
                      </p>
                      <p className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatLabel(item.content_type)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-violet-100 bg-violet-50/70 p-3 dark:border-violet-900 dark:bg-white/[0.03]">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Category
                      </p>
                      <p className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-200">
                        {item.category}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Imported: {formatDate(item.created_at)}
                  </p>

                  <Link
                    href={`/admin/import-queue/review/${encodeURIComponent(item.id)}`}
                    className="flex w-full items-center justify-center rounded-xl bg-violet-700 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-violet-800"
                  >
                    Review Content →
                  </Link>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl dark:bg-amber-900/50">
            🛡️
          </span>
          <div>
            <h2 className="font-black text-amber-950 dark:text-amber-200">
              Import safety reminder
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900 dark:text-amber-100">
              Imported information should be checked against the official
              notification. This page does not automatically publish records
              simply because they appear in the queue.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function getString(
  row: Record<string, unknown>,
  keys: string[],
  fallback: string
): string {
  for (const key of keys) {
    const value = row[key];

    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return fallback;
}

function normalizeStatus(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function formatLabel(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null): string {
  if (!value) return "Date unavailable";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function StatusBadge({ status }: { status: string }) {
  const normalized = normalizeStatus(status);

  const styles: Record<string, string> = {
    pending:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
    approved:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
    published:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
    rejected:
      "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
    duplicate:
      "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide ${
        styles[normalized] ??
        "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-200"
      }`}
    >
      {formatLabel(status || "unknown").toUpperCase()}
    </span>
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
  tone: "violet" | "amber" | "green" | "blue" | "red";
}) {
  const tones = {
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    blue:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
    red:
      "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
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

function WorkflowStep({
  number,
  title,
  description,
  color,
}: {
  number: string;
  title: string;
  description: string;
  color: "violet" | "blue" | "amber" | "green";
}) {
  const colors = {
    violet:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
    blue:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300",
    amber:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
    green:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  };

  return (
    <div className="rounded-2xl border border-violet-100 bg-white p-4 dark:border-violet-900 dark:bg-white/[0.02]">
      <span className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-black ${colors[color]}`}>
        STEP {number}
      </span>
      <h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}