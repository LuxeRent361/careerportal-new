import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  title: string | null;
  organization: string | null;
  location: string | null;
  qualification: string | null;
  category: string | null;
  type: string | null;
  vacancies: number | null;
  salary: string | null;
  application_start: string | null;
  last_date: string | null;
  exam_date: string | null;
  expiry_date: string | null;
  is_published: boolean | null;
  created_at?: string | null;
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function isExpired(job: Job) {
  if (!job.expiry_date) return false;

  const expiry = new Date(job.expiry_date);

  if (Number.isNaN(expiry.getTime())) {
    return false;
  }

  return expiry.getTime() < Date.now();
}

function getStatus(job: Job) {
  if (isExpired(job)) {
    return {
      label: "Expired",
      className:
        "bg-red-50 text-red-700 ring-1 ring-red-100",
    };
  }

  if (job.is_published) {
    return {
      label: "Published",
      className:
        "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    };
  }

  return {
    label: "Draft",
    className:
      "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  };
}

export default async function AdminJobsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/jobs");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      organization,
      location,
      qualification,
      category,
      type,
      vacancies,
      salary,
      application_start,
      last_date,
      exam_date,
      expiry_date,
      is_published,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    return (
      <section className="space-y-6">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            GOVERNMENT JOBS
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Jobs Management
          </h1>
        </div>

        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            !
          </div>

          <h2 className="mt-4 text-lg font-extrabold text-slate-900">
            Unable to load jobs
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {error.message}
          </p>

          <Link
            href="/admin"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-blue-700"
          >
            Back to Dashboard
          </Link>
        </div>
      </section>
    );
  }

  const jobs = (data ?? []) as Job[];

  const publishedCount = jobs.filter(
    (job) => job.is_published && !isExpired(job)
  ).length;

  const draftCount = jobs.filter(
    (job) => !job.is_published && !isExpired(job)
  ).length;

  const expiredCount = jobs.filter(isExpired).length;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            GOVERNMENT JOBS
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Jobs Management
          </h1>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            Manage government job notifications, publication
            status, application dates and expiry information.
          </p>
        </div>

        <Link
          href="/admin/jobs/new"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
        >
          <span className="text-lg leading-none">+</span>
          Add New Job
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Jobs"
          value={jobs.length}
          icon="💼"
          tone="blue"
        />

        <StatCard
          label="Published"
          value={publishedCount}
          icon="✓"
          tone="green"
        />

        <StatCard
          label="Drafts"
          value={draftCount}
          icon="📝"
          tone="amber"
        />

        <StatCard
          label="Expired"
          value={expiredCount}
          icon="⌛"
          tone="red"
        />
      </div>

      {/* Search / Filter UI */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>

            <input
              type="search"
              placeholder="Search jobs, organizations or categories..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <select
            defaultValue="all"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          >
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
          </select>

          <select
            defaultValue="all"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
          >
            <option value="all">All Categories</option>
            <option value="Railway">Railway</option>
            <option value="SSC">SSC</option>
            <option value="UPSC">UPSC</option>
            <option value="Banking">Banking</option>
            <option value="Teaching">Teaching</option>
            <option value="Defence">Defence</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              All Government Jobs
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              {jobs.length} job{jobs.length === 1 ? "" : "s"} in
              the database
            </p>
          </div>

          <Link
            href="/admin/jobs/new"
            className="text-sm font-extrabold text-blue-600 hover:text-blue-700"
          >
            + Add Job
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              💼
            </div>

            <h3 className="mt-4 text-lg font-extrabold text-slate-900">
              No jobs found
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              There are currently no government jobs in the
              database. Add your first job notification to get
              started.
            </p>

            <Link
              href="/admin/jobs/new"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Add First Job
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Job
                    </th>

                    <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Category
                    </th>

                    <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Vacancies
                    </th>

                    <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Last Date
                    </th>

                    <th className="px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => {
                    const status = getStatus(job);

                    return (
                      <tr
                        key={job.id}
                        className="transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="max-w-[360px]">
                            <p className="font-extrabold text-slate-900">
                              {job.title || "Untitled Job"}
                            </p>

                            <p className="mt-1 truncate text-xs font-semibold text-slate-500">
                              {job.organization ||
                                "Organization not specified"}
                            </p>

                            {job.location && (
                              <p className="mt-1 text-xs text-slate-400">
                                📍 {job.location}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                              {job.category || "General"}
                            </span>

                            {job.type && (
                              <p className="text-xs text-slate-400">
                                {job.type}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-slate-700">
                            {job.vacancies ?? "—"}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <p className="text-sm font-bold text-slate-700">
                            {formatDate(job.last_date)}
                          </p>

                          {job.exam_date && (
                            <p className="mt-1 text-xs text-slate-400">
                              Exam: {formatDate(job.exam_date)}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-extrabold ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <Link
                            href={`/admin/jobs/${job.id}`}
                            className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / tablet cards */}
            <div className="divide-y divide-slate-100 lg:hidden">
              {jobs.map((job) => {
                const status = getStatus(job);

                return (
                  <div
                    key={job.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-extrabold leading-6 text-slate-900">
                          {job.title || "Untitled Job"}
                        </h3>

                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {job.organization ||
                            "Organization not specified"}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-extrabold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <InfoItem
                        label="Category"
                        value={job.category || "General"}
                      />

                      <InfoItem
                        label="Vacancies"
                        value={
                          job.vacancies !== null
                            ? String(job.vacancies)
                            : "—"
                        }
                      />

                      <InfoItem
                        label="Last Date"
                        value={formatDate(job.last_date)}
                      />

                      <InfoItem
                        label="Location"
                        value={job.location || "—"}
                      />
                    </div>

                    <Link
                      href={`/admin/jobs/${job.id}`}
                      className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
                    >
                      Manage Job
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
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
  tone: "blue" | "green" | "amber" | "red";
}) {
  const styles = {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      value: "text-blue-700",
    },
    green: {
      icon: "bg-emerald-50 text-emerald-600",
      value: "text-emerald-700",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      value: "text-amber-700",
    },
    red: {
      icon: "bg-red-50 text-red-600",
      value: "text-red-700",
    },
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-500">
            {label}
          </p>

          <p
            className={`mt-2 text-2xl font-extrabold ${styles[tone].value}`}
          >
            {value}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl text-lg ${styles[tone].icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

function InfoItem({
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