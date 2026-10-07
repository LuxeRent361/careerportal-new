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

export default async function ActivityLogsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/logs");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { data: logs, error } = await supabase
    .from("activity_logs")
    .select(
      "id,actor_user_id,actor_email,action,entity_type,entity_id,description,metadata,created_at"
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(200);

  const items = logs ?? [];

  const total = items.length;

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const todayCount = items.filter((item) => {
    const date = new Date(item.created_at);
    return date >= todayStart;
  }).length;

  const adminActions = items.filter(
    (item) => item.actor_email
  ).length;

  const contentActions = items.filter((item) => {
    const type = String(
      item.entity_type || ""
    ).toLowerCase();

    return [
      "job",
      "jobs",
      "exam",
      "exams",
      "result",
      "results",
      "education",
      "admit_card",
      "private_job",
    ].includes(type);
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            System
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Activity Logs
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Track administrative actions and important changes
            made across CareerPortal.
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Recent Logs"
          value={total}
          icon="📋"
        />

        <StatCard
          label="Today"
          value={todayCount}
          icon="📅"
        />

        <StatCard
          label="Admin Actions"
          value={adminActions}
          icon="🛡️"
        />

        <StatCard
          label="Content Actions"
          value={contentActions}
          icon="📝"
        />
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Unable to load activity logs: {error.message}
        </div>
      ) : null}

      {/* Logs */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Recent Activity
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-500">
                Latest 200 recorded administrative activities.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
              {total} logs
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              📋
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No activity recorded
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Administrative actions will appear here as the
              system records them.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Date
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Admin
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Action
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Entity
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Description
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((log) => (
                    <tr
                      key={log.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(log.created_at)}
                      </td>

                      <td className="max-w-[190px] truncate px-5 py-4 text-xs font-bold text-slate-700">
                        {log.actor_email || "System"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-blue-700">
                          {log.action}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div>
                          <p className="text-xs font-extrabold capitalize text-slate-700">
                            {log.entity_type || "System"}
                          </p>

                          {log.entity_id ? (
                            <p className="mt-0.5 max-w-[160px] truncate text-[10px] font-medium text-slate-400">
                              {log.entity_id}
                            </p>
                          ) : null}
                        </div>
                      </td>

                      <td className="max-w-[360px] px-5 py-4 text-xs leading-5 text-slate-600">
                        {log.description ||
                          "No description available."}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="divide-y divide-slate-100 md:hidden">
              {items.map((log) => (
                <div
                  key={log.id}
                  className="p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-slate-700">
                        {log.actor_email || "System"}
                      </p>

                      <p className="mt-1 text-[10px] font-medium text-slate-400">
                        {formatDate(log.created_at)}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-blue-700">
                      {log.action}
                    </span>
                  </div>

                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-extrabold capitalize text-slate-700">
                      {log.entity_type || "System"}
                    </p>

                    {log.entity_id ? (
                      <p className="mt-1 break-all text-[10px] text-slate-400">
                        {log.entity_id}
                      </p>
                    ) : null}

                    <p className="mt-3 text-xs leading-5 text-slate-600">
                      {log.description ||
                        "No description available."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
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