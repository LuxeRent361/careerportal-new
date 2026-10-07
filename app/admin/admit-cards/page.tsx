import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function createAdminClient() {
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

type SearchParams = {
  q?: string;
  status?: string;
  featured?: string;
};

export default async function AdmitCardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/admit-cards");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;

  const supabase = createAdminClient();

  let query = supabase
    .from("admit_cards")
    .select(
      `
      id,
      title,
      slug,
      organization,
      category_id,
      exam_name,
      description,
      exam_date,
      release_date,
      expiry_date,
      admit_card_url,
      official_website,
      is_featured,
      is_published,
      created_at,
      updated_at
    `
    )
    .order("created_at", { ascending: false });

  const q = params.q?.trim();

  if (q) {
    query = query.or(
      `title.ilike.%${q}%,organization.ilike.%${q}%,exam_name.ilike.%${q}%`
    );
  }

  if (params.status === "published") {
    query = query.eq("is_published", true);
  }

  if (params.status === "draft") {
    query = query.eq("is_published", false);
  }

  if (params.featured === "yes") {
    query = query.eq("is_featured", true);
  }

  const [{ data: admitCards, error }, { count: total }, { count: published }, { count: featured }] =
    await Promise.all([
      query,
      supabase
        .from("admit_cards")
        .select("*", { count: "exact", head: true }),
      supabase
        .from("admit_cards")
        .select("*", { count: "exact", head: true })
        .eq("is_published", true),
      supabase
        .from("admit_cards")
        .select("*", { count: "exact", head: true })
        .eq("is_featured", true),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  const today = new Date().toISOString().slice(0, 10);

  const draft = Math.max((total ?? 0) - (published ?? 0), 0);

  const expired =
    admitCards?.filter(
      (item) =>
        Boolean(item.expiry_date) &&
        item.expiry_date < today
    ).length ?? 0;

  const categoryIds = Array.from(
    new Set(
      (admitCards ?? [])
        .map((item) => item.category_id)
        .filter(Boolean)
    )
  );

  let categoryMap = new Map<string, string>();

  if (categoryIds.length > 0) {
    const { data: categories } = await supabase
      .from("categories")
      .select("id,name")
      .in("id", categoryIds);

    categoryMap = new Map(
      (categories ?? []).map((category) => [
        category.id,
        category.name,
      ])
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Admit Cards
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage admit card notifications, exam dates, release dates,
            official links and publication status.
          </p>
        </div>

        <Link
          href="/admin/admit-cards/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
        >
          + Add Admit Card
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total"
          value={total ?? 0}
          icon="🎫"
        />
        <StatCard
          label="Published"
          value={published ?? 0}
          icon="✓"
        />
        <StatCard
          label="Drafts"
          value={draft}
          icon="📝"
        />
        <StatCard
          label="Featured"
          value={featured ?? 0}
          icon="⭐"
        />
        <StatCard
          label="Expired"
          value={expired}
          icon="⏱️"
        />
      </div>

      <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          method="GET"
          className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]"
        >
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search title, organization or exam..."
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-blue-500 focus:bg-white"
          />

          <select
            name="status"
            defaultValue={params.status ?? ""}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>

          <select
            name="featured"
            defaultValue={params.featured ?? ""}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-500"
          >
            <option value="">All Items</option>
            <option value="yes">Featured Only</option>
          </select>

          <button
            type="submit"
            className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-extrabold text-white transition hover:bg-slate-800"
          >
            Search
          </button>
        </form>
      </div>

      <div className="mt-7 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Admit Card
                </th>
                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Organization
                </th>
                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Category
                </th>
                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Dates
                </th>
                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-5 py-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {(admitCards ?? []).map((item) => {
                const isExpired =
                  Boolean(item.expiry_date) &&
                  item.expiry_date < today;

                return (
                  <tr
                    key={item.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="max-w-[330px]">
                        <Link
                          href={`/admin/admit-cards/${item.id}`}
                          className="font-bold text-slate-900 hover:text-blue-600"
                        >
                          {item.title}
                        </Link>

                        {item.exam_name && (
                          <p className="mt-1 text-xs font-medium text-slate-500">
                            {item.exam_name}
                          </p>
                        )}

                        {item.is_featured && (
                          <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-extrabold text-amber-700">
                            FEATURED
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                      {item.organization || "—"}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-slate-600">
                      {item.category_id
                        ? categoryMap.get(item.category_id) || "—"
                        : "—"}
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1 text-xs font-semibold text-slate-600">
                        <p>
                          Release:{" "}
                          {item.release_date || "—"}
                        </p>
                        <p>
                          Exam:{" "}
                          {item.exam_date || "—"}
                        </p>
                        <p
                          className={
                            isExpired
                              ? "font-extrabold text-red-600"
                              : ""
                          }
                        >
                          Expiry:{" "}
                          {item.expiry_date || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        published={item.is_published}
                        expired={isExpired}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/admit-cards/${item.id}`}
                        className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(!admitCards || admitCards.length === 0) && (
          <EmptyState />
        )}
      </div>

      <div className="mt-6 space-y-4 lg:hidden">
        {(admitCards ?? []).map((item) => {
          const isExpired =
            Boolean(item.expiry_date) &&
            item.expiry_date < today;

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/admin/admit-cards/${item.id}`}
                    className="font-extrabold text-slate-900"
                  >
                    {item.title}
                  </Link>

                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {item.organization || "Organization not specified"}
                  </p>
                </div>

                <StatusBadge
                  published={item.is_published}
                  expired={isExpired}
                />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <InfoBox
                  label="Exam"
                  value={item.exam_date || "—"}
                />
                <InfoBox
                  label="Release"
                  value={item.release_date || "—"}
                />
                <InfoBox
                  label="Expiry"
                  value={item.expiry_date || "—"}
                />
                <InfoBox
                  label="Category"
                  value={
                    item.category_id
                      ? categoryMap.get(item.category_id) || "—"
                      : "—"
                  }
                />
              </div>

              <Link
                href={`/admin/admit-cards/${item.id}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white"
              >
                Edit Admit Card
              </Link>
            </div>
          );
        })}

        {(!admitCards || admitCards.length === 0) && (
          <EmptyState />
        )}
      </div>
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
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-extrabold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function StatusBadge({
  published,
  expired,
}: {
  published: boolean;
  expired: boolean;
}) {
  if (expired) {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-extrabold text-red-700">
        EXPIRED
      </span>
    );
  }

  return published ? (
    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
      PUBLISHED
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">
      DRAFT
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
      <p className="mt-1 truncate text-xs font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        🎫
      </div>

      <h3 className="mt-4 text-lg font-extrabold text-slate-900">
        No admit cards found
      </h3>

      <p className="mt-2 text-sm text-slate-500">
        Add your first admit card notification to get started.
      </p>

      <Link
        href="/admin/admit-cards/new"
        className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white"
      >
        Add Admit Card
      </Link>
    </div>
  );
}