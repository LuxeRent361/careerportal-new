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
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  const rows =
    (data ?? []) as Record<string, unknown>[];

  const items: QueueItem[] = rows.map((row) => ({
    id: String(row.id ?? ""),

    title:
      String(
        row.title ??
          row.headline ??
          row.name ??
          "Untitled Content"
      ),

    source:
      String(
        row.source ??
          row.source_code ??
          row.source_name ??
          "Unknown"
      ),

    content_type:
      String(
        row.content_type ??
          row.type ??
          row.content_type_code ??
          "Unknown"
      ),

    category:
      String(
        row.category ??
          row.category_name ??
          "Uncategorized"
      ),

    status:
      String(
        row.status ??
          row.import_status ??
          "pending"
      ),

    created_at:
      row.created_at !== undefined &&
      row.created_at !== null
        ? String(row.created_at)
        : null,
  }));

  const pending = items.filter(
    (item) =>
      normalizeStatus(item.status) ===
      "pending"
  ).length;

  const approved = items.filter(
    (item) =>
      normalizeStatus(item.status) ===
      "approved"
  ).length;

  const published = items.filter(
    (item) =>
      normalizeStatus(item.status) ===
      "published"
  ).length;

  const rejected = items.filter(
    (item) =>
      normalizeStatus(item.status) ===
      "rejected"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Automation
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Import Queue
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Review content discovered from official sources before
            it becomes public CareerPortal content.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/sources"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
          >
            ← Sources
          </Link>

          <Link
            href="/admin/sources/history"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
          >
            History
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
                Unable to load Import Queue
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
          label="Pending Review"
          value={pending}
          icon="⏳"
        />

        <StatCard
          label="Approved"
          value={approved}
          icon="✓"
        />

        <StatCard
          label="Published"
          value={published}
          icon="🚀"
        />

        <StatCard
          label="Rejected"
          value={rejected}
          icon="✕"
        />
      </div>

      {/* Workflow */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
              Content Workflow
            </p>

            <h2 className="mt-1 text-base font-extrabold text-blue-950">
              Source → Review → Approve → Publish
            </h2>

            <p className="mt-2 max-w-2xl text-xs leading-5 text-blue-800/80">
              Automatically discovered content should be reviewed
              before publishing. This helps keep CareerPortal
              accurate, useful and free from incorrect or duplicate
              information.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <WorkflowStep
              number="1"
              label="Source"
            />

            <WorkflowArrow />

            <WorkflowStep
              number="2"
              label="Review"
            />

            <WorkflowArrow />

            <WorkflowStep
              number="3"
              label="Approve"
            />

            <WorkflowArrow />

            <WorkflowStep
              number="4"
              label="Publish"
            />
          </div>
        </div>
      </section>

      {/* Queue */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Imported Content
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Latest 200 items received by the import system.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
              {items.length} items
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              📥
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              Import Queue is empty
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              When source monitoring discovers content, it will
              appear here for administrator review.
            </p>

            <Link
              href="/admin/sources"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-700"
            >
              Check Sources
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Content
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Source
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Type
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Category
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="max-w-[320px] px-5 py-4">
                        <p className="truncate text-xs font-extrabold text-slate-800">
                          {item.title}
                        </p>

                        <p className="mt-1 max-w-[300px] truncate text-[10px] text-slate-400">
                          ID: {item.id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-blue-700">
                          {item.source}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold capitalize text-slate-600">
                        {formatLabel(item.content_type)}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-600">
                        {formatLabel(item.category)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={item.status}
                        />
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(item.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/import-queue/review/${encodeURIComponent(
                            item.id
                          )}`}
                          className="inline-flex rounded-xl bg-blue-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-blue-700"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold leading-5 text-slate-900">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        {formatDate(item.created_at)}
                      </p>
                    </div>

                    <StatusBadge
                      status={item.status}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <InfoBox
                      label="Source"
                      value={item.source}
                    />

                    <InfoBox
                      label="Type"
                      value={formatLabel(
                        item.content_type
                      )}
                    />

                    <InfoBox
                      label="Category"
                      value={formatLabel(
                        item.category
                      )}
                    />

                    <InfoBox
                      label="ID"
                      value={item.id}
                    />
                  </div>

                  <Link
                    href={`/admin/import-queue/review/${encodeURIComponent(
                      item.id
                    )}`}
                    className="mt-4 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-xs font-extrabold text-white transition hover:bg-blue-700"
                  >
                    Review Content
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* Information */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-lg">
            ℹ️
          </div>

          <div>
            <h2 className="text-sm font-extrabold text-slate-900">
              Import Safety
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Imported content is not automatically treated as
              published content. Administrators should verify the
              source, title, dates, eligibility, links and other
              important information before publishing.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function normalizeStatus(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
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

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "pending") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-amber-700">
        PENDING
      </span>
    );
  }

  if (normalized === "approved") {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-blue-700">
        APPROVED
      </span>
    );
  }

  if (normalized === "published") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-700">
        PUBLISHED
      </span>
    );
  }

  if (normalized === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-red-700">
        REJECTED
      </span>
    );
  }

  if (normalized === "duplicate") {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-600">
        DUPLICATE
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-600">
      {formatLabel(status)}
    </span>
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

function WorkflowStep({
  number,
  label,
}: {
  number: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">
        {number}
      </span>

      <span className="text-xs font-extrabold text-slate-700">
        {label}
      </span>
    </div>
  );
}

function WorkflowArrow() {
  return (
    <span className="hidden text-blue-300 sm:inline">
      →
    </span>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-xs font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}