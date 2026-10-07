import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  category?: string;
};

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
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

export default async function FaqAdminPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/faqs");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;
  const q = (params.q || "").trim();
  const category = (params.category || "").trim();

  const supabase = createServiceClient();

  let query = supabase
    .from("faqs")
    .select(
      "id,question,answer,category,sort_order,is_published,created_at,updated_at"
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `question.ilike.%${q}%,answer.ilike.%${q}%,category.ilike.%${q}%`
    );
  }

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    console.error("FAQ list error:", error);
  }

  const faqs = (data || []) as FaqRow[];

  const { data: categoryRows } = await supabase
    .from("faqs")
    .select("category")
    .not("category", "is", null);

  const categories = Array.from(
    new Set(
      (categoryRows || [])
        .map((item) => item.category)
        .filter(
          (item): item is string =>
            Boolean(item && item.trim())
        )
    )
  ).sort((a, b) => a.localeCompare(b));

  const total = faqs.length;
  const published = faqs.filter(
    (item) => item.is_published
  ).length;
  const drafts = total - published;
  const categoryCount = categories.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            FAQs
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage frequently asked questions and answers used throughout
            CareerPortal.
          </p>
        </div>

        <Link
          href="/admin/faqs/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add FAQ
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total FAQs"
          value={total}
          icon="❓"
          tone="blue"
        />

        <StatCard
          label="Published"
          value={published}
          icon="✓"
          tone="green"
        />

        <StatCard
          label="Drafts"
          value={drafts}
          icon="📝"
          tone="slate"
        />

        <StatCard
          label="Categories"
          value={categoryCount}
          icon="🗂️"
          tone="amber"
        />
      </div>

      {/* Search / Filter */}
      <form
        method="get"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              🔎
            </span>

            <input
              name="q"
              defaultValue={q}
              placeholder="Search question, answer or category..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
          </div>

          <select
            name="category"
            defaultValue={category}
            className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
          >
            <option value="">All categories</option>

            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800"
          >
            Search
          </button>

          {(q || category) && (
            <Link
              href="/admin/faqs"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </div>
      </form>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          FAQs could not be loaded. Please check the database connection.
        </div>
      )}

      {/* Desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-extrabold text-slate-900">
            FAQ Records
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500">
            {faqs.length} records
          </p>
        </div>

        {faqs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                  <th className="w-16 px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    #
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Question
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Category
                  </th>

                  <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                    Order
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
                {faqs.map((faq, index) => (
                  <tr
                    key={faq.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 text-sm font-bold text-slate-400">
                      {index + 1}
                    </td>

                    <td className="max-w-[520px] px-5 py-4">
                      <p className="font-bold text-slate-900">
                        {faq.question}
                      </p>

                      <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-400">
                        {faq.answer}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {faq.category ? (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                          {faq.category}
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">
                          Uncategorized
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-slate-100 px-2 text-xs font-extrabold text-slate-600">
                        {faq.sort_order}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        active={faq.is_published}
                        activeText="Published"
                        inactiveText="Draft"
                      />
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/faqs/${faq.id}`}
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
        {faqs.length === 0 ? (
          <EmptyState />
        ) : (
          faqs.map((faq, index) => (
            <div
              key={faq.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
                  ❓
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold text-slate-400">
                      #{index + 1}
                    </span>

                    <StatusBadge
                      active={faq.is_published}
                      activeText="Published"
                      inactiveText="Draft"
                    />
                  </div>

                  <h3 className="mt-2 font-extrabold leading-5 text-slate-900">
                    {faq.question}
                  </h3>
                </div>
              </div>

              <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-500">
                {faq.answer}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {faq.category && (
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                    {faq.category}
                  </span>
                )}

                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                  Order: {faq.sort_order}
                </span>
              </div>

              <Link
                href={`/admin/faqs/${faq.id}`}
                className="mt-4 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800"
              >
                Edit FAQ
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

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
        ❓
      </div>

      <h3 className="mt-4 text-sm font-extrabold text-slate-900">
        No FAQs found
      </h3>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        Add useful questions and answers for CareerPortal visitors.
      </p>

      <Link
        href="/admin/faqs/new"
        className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-blue-700"
      >
        + Add FAQ
      </Link>
    </div>
  );
}