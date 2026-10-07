import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
};

type ExamRow = {
  id: string;
  title: string;
  slug: string | null;
  organization: string | null;
  exam_type: string | null;
  category_id: string | null;
  application_start: string | null;
  last_date: string | null;
  exam_date: string | null;
  expiry_date: string | null;
  is_featured: boolean;
  is_published: boolean;
  created_at: string | null;
  categories?: {
  name: string;
} | null;
};

function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export default async function ExamsAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/exams");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;
  const q = (params.q || "").trim();

  const supabase = createServiceClient();

  let query = supabase
    .from("exams")
    .select(
      `
        id,
        title,
        slug,
        organization,
        exam_type,
        category_id,
        application_start,
        last_date,
        exam_date,
        expiry_date,
        is_featured,
        is_published,
        created_at,
        categories (
          name
        )
      `
    )
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,organization.ilike.%${q}%,exam_type.ilike.%${q}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Exams admin list error:", error);
  }

  const exams = (data || []).map((item) => ({
  ...item,
  categories: Array.isArray(item.categories)
    ? item.categories[0] ?? null
    : item.categories ?? null,
})) as ExamRow[];

  const total = exams.length;
  const published = exams.filter((item) => item.is_published).length;
  const featured = exams.filter((item) => item.is_featured).length;
  const drafts = total - published;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Exams
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage competitive exams, eligibility, syllabus, application
            dates, exam dates and official links.
          </p>
        </div>

        <Link
          href="/admin/exams/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add Exam
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Exams"
          value={total}
          icon="📝"
          tone="blue"
        />

        <StatCard
          label="Published"
          value={published}
          icon="✓"
          tone="green"
        />

        <StatCard
          label="Featured"
          value={featured}
          icon="★"
          tone="amber"
        />

        <StatCard
          label="Drafts"
          value={drafts}
          icon="🗂️"
          tone="slate"
        />
      </div>

      {/* Search */}
      <form
        method="get"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>

            <input
              name="q"
              defaultValue={q}
              placeholder="Search by exam title, organization or exam type..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
          >
            Search
          </button>

          {q && (
            <Link
              href="/admin/exams"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Exams could not be loaded. Please check the database connection.
        </div>
      )}

      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-extrabold text-slate-900">
            Exam Records
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500">
            {q
              ? `${exams.length} matching records`
              : `${exams.length} total records`}
          </p>
        </div>

        {exams.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Exam
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Organization
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Category
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Last Date
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Exam Date
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {exams.map((exam) => (
                  <tr
                    key={exam.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
                          📝
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">
                            {exam.title}
                          </p>

                          {exam.exam_type && (
                            <p className="mt-1 text-xs font-semibold text-slate-400">
                              {exam.exam_type}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-slate-600">
                        {exam.organization || "—"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                        {exam.categories?.name || "Uncategorized"}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-slate-600">
                        {formatDate(exam.last_date)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-semibold text-slate-600">
                        {formatDate(exam.exam_date)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge
                          active={exam.is_published}
                          activeText="Published"
                          inactiveText="Draft"
                        />

                        {exam.is_featured && (
                          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                            ★ Featured
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/exams/${exam.id}`}
                        className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Mobile */}
      <div className="space-y-3 lg:hidden">
        {exams.length === 0 ? (
          <EmptyState />
        ) : (
          exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
                  📝
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-extrabold leading-5 text-slate-900">
                    {exam.title}
                  </h3>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {exam.organization || "Organization not specified"}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <InfoBox
                  label="Last Date"
                  value={formatDate(exam.last_date)}
                />

                <InfoBox
                  label="Exam Date"
                  value={formatDate(exam.exam_date)}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  {exam.categories?.name || "Uncategorized"}
                </span>

                <StatusBadge
                  active={exam.is_published}
                  activeText="Published"
                  inactiveText="Draft"
                />

                {exam.is_featured && (
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    ★ Featured
                  </span>
                )}
              </div>

              <Link
                href={`/admin/exams/${exam.id}`}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white transition hover:bg-slate-800"
              >
                Edit Exam
              </Link>
            </div>
          ))
        )}
      </div>
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
  tone: "blue" | "green" | "amber" | "slate";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-extrabold ${styles[tone]}`}
        >
          {icon}
        </div>

        <span className="text-2xl font-extrabold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-bold text-slate-500">
        {label}
      </p>
    </div>
  );
}

function StatusBadge({
  active,
  activeText,
  inactiveText,
}: {
  active: boolean;
  activeText: string;
  inactiveText: string;
}) {
  return active ? (
    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
      ✓ {activeText}
    </span>
  ) : (
    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
      {inactiveText}
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
      <p className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xs font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
        📝
      </div>

      <h3 className="mt-4 text-sm font-extrabold text-slate-900">
        No exams found
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        Add your first exam to start building the exam section.
      </p>

      <Link
        href="/admin/exams/new"
        className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-blue-700"
      >
        + Add Exam
      </Link>
    </div>
  );
}