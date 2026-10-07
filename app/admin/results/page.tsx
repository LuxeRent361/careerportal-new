import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type Result = {
  id: string;
  title: string;
  slug: string | null;
  organization: string | null;
  category_id: string | null;
  exam_name: string | null;
  description: string | null;
  qualification: string | null;
  result_date: string | null;
  expiry_date: string | null;
  result_url: string | null;
  official_website: string | null;
  status: string;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type Category = {
  id: string;
  name: string;
};

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

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
  }).format(date);
}

async function togglePublish(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/results");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

  if (!id) {
    redirect("/admin/results?error=Result%20ID%20is%20missing");
  }

  const supabase = createAdminClient();

  const { data: result, error: fetchError } = await supabase
    .from("results")
    .select("id,title,is_published")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !result) {
    redirect(
      `/admin/results?error=${encodeURIComponent(
        fetchError?.message || "Result not found"
      )}`
    );
  }

  const nextValue = !result.is_published;

  const { error } = await supabase
    .from("results")
    .update({
      is_published: nextValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/results?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "publish_toggle",
    entity_type: "result",
    entity_id: id,
    description: `${
      nextValue ? "Published" : "Unpublished"
    } result: ${result.title}`,
    metadata: {
      is_published: nextValue,
    },
  });

  redirect("/admin/results?saved=1");
}

async function deleteResult(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/results");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

  if (!id) {
    redirect("/admin/results?error=Result%20ID%20is%20missing");
  }

  const supabase = createAdminClient();

  const { data: result } = await supabase
    .from("results")
    .select("id,title,slug")
    .eq("id", id)
    .maybeSingle();

  if (!result) {
    redirect("/admin/results?error=Result%20not%20found");
  }

  const { error } = await supabase
    .from("results")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/results?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "delete",
    entity_type: "result",
    entity_id: id,
    description: `Deleted result: ${result.title}`,
    metadata: {
      title: result.title,
      slug: result.slug,
    },
  });

  redirect("/admin/results?deleted=1");
}

export default async function ResultsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/results");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;
  const supabase = createAdminClient();

  const [{ data: results, error }, { data: categories }] =
    await Promise.all([
      supabase
        .from("results")
        .select("*")
        .order("created_at", { ascending: false }),

      supabase
        .from("categories")
        .select("id,name")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

  if (error) {
    throw new Error(error.message);
  }

  const allResults = (results || []) as Result[];
  const allCategories = (categories || []) as Category[];

  const query = String(params.q || "").trim().toLowerCase();
  const statusFilter = String(params.status || "").trim();
  const categoryFilter = String(params.category || "").trim();

  let filtered = [...allResults];

  if (query) {
    filtered = filtered.filter((result) =>
      [
        result.title,
        result.organization,
        result.exam_name,
        result.qualification,
        result.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  if (statusFilter === "published") {
    filtered = filtered.filter(
      (result) => result.is_published
    );
  }

  if (statusFilter === "draft") {
    filtered = filtered.filter(
      (result) => !result.is_published
    );
  }

  if (statusFilter === "expired") {
    filtered = filtered.filter((result) => {
      if (!result.expiry_date) return false;

      return new Date(result.expiry_date) < new Date();
    });
  }

  if (categoryFilter) {
    filtered = filtered.filter(
      (result) => result.category_id === categoryFilter
    );
  }

  const published = allResults.filter(
    (result) => result.is_published
  ).length;

  const drafts = allResults.length - published;

  const expired = allResults.filter((result) => {
    if (!result.expiry_date) return false;

    return new Date(result.expiry_date) < new Date();
  }).length;

  const today = new Date();

  const recent = allResults.filter((result) => {
    if (!result.result_date) return false;

    const resultDate = new Date(result.result_date);

    return resultDate >= new Date(
      today.getTime() - 30 * 24 * 60 * 60 * 1000
    );
  }).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Results
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage examination results, result dates, official links,
            publication status and expiry information.
          </p>
        </div>

        <Link
          href="/admin/results/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
        >
          + Add Result
        </Link>
      </div>

      {params.saved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Result updated successfully.
        </div>
      )}

      {params.deleted && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Result deleted successfully.
        </div>
      )}

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {params.error}
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Results"
          value={allResults.length}
          icon="🏆"
        />

        <StatCard
          label="Published"
          value={published}
          icon="🌐"
        />

        <StatCard
          label="Drafts"
          value={drafts}
          icon="📝"
        />

        <StatCard
          label="Expired"
          value={expired}
          icon="⏰"
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">
            Results in Last 30 Days
          </p>

          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {recent}
          </p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue-500">
            Public Results
          </p>

          <p className="mt-2 text-2xl font-extrabold text-blue-700">
            {published}
          </p>
        </div>
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          method="GET"
          className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]"
        >
          <input
            name="q"
            defaultValue={params.q || ""}
            placeholder="Search result, exam, organization..."
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
          />

          <select
            name="status"
            defaultValue={params.status || ""}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
          </select>

          <select
            name="category"
            defaultValue={params.category || ""}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Categories</option>

            {allCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Filter
            </button>

            <Link
              href="/admin/results"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-900">
            Result Listings
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Showing {filtered.length} of {allResults.length} results
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🏆
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No results found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add a result or change your search filters.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1150px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Result
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Organization
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Exam
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Result Date
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filtered.map((result) => (
                    <tr
                      key={result.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="max-w-[280px]">
                          <p className="truncate text-sm font-extrabold text-slate-900">
                            {result.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {result.qualification || "—"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {result.organization || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {result.exam_name || "—"}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(result.result_date)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${
                            result.is_published
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {result.is_published
                            ? "Published"
                            : "Draft"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/results/${result.id}`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </Link>

                          <form action={togglePublish}>
                            <input
                              type="hidden"
                              name="id"
                              value={result.id}
                            />

                            <button
                              type="submit"
                              className={`rounded-lg px-3 py-2 text-xs font-extrabold ${
                                result.is_published
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {result.is_published
                                ? "Unpublish"
                                : "Publish"}
                            </button>
                          </form>

                          <form action={deleteResult}>
                            <input
                              type="hidden"
                              name="id"
                              value={result.id}
                            />

                            <button
                              type="submit"
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700"
                            >
                              Delete
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden">
              {filtered.map((result) => (
                <article
                  key={result.id}
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {result.title}
                      </h3>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {result.organization ||
                          "Organization not specified"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                        result.is_published
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {result.is_published
                        ? "Published"
                        : "Draft"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Info
                      label="Exam"
                      value={result.exam_name || "—"}
                    />

                    <Info
                      label="Result Date"
                      value={formatDate(result.result_date)}
                    />

                    <Info
                      label="Status"
                      value={result.status || "—"}
                    />

                    <Info
                      label="Qualification"
                      value={result.qualification || "—"}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Link
                      href={`/admin/results/${result.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-700"
                    >
                      Edit
                    </Link>

                    <form action={togglePublish}>
                      <input
                        type="hidden"
                        name="id"
                        value={result.id}
                      />

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-extrabold text-blue-700"
                      >
                        {result.is_published
                          ? "Unpublish"
                          : "Publish"}
                      </button>
                    </form>

                    <form action={deleteResult}>
                      <input
                        type="hidden"
                        name="id"
                        value={result.id}
                      />

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-red-50 px-3 py-2.5 text-xs font-extrabold text-red-700"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
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
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-lg">
          {icon}
        </span>

        <span className="text-2xl font-extrabold text-slate-900">
          {value}
        </span>
      </div>

      <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </p>
    </div>
  );
}

function Info({
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