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

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/categories");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const query = await searchParams;
  const supabase = createAdminClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select(
      "id,name,slug,description,icon,color,sort_order,is_active,created_at,updated_at"
    )
    .order("sort_order", {
      ascending: true,
    })
    .order("name", {
      ascending: true,
    });

  const items = categories ?? [];

  const active = items.filter(
    (item) => item.is_active
  ).length;

  const inactive = items.filter(
    (item) => !item.is_active
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Categories
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Organize government jobs, private jobs, exams, results,
            education and other CareerPortal content.
          </p>
        </div>

        <Link
          href="/admin/categories/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
        >
          + Add Category
        </Link>
      </div>

      {query.success === "created" ? (
        <Message
          type="success"
          text="Category created successfully."
        />
      ) : null}

      {query.success === "updated" ? (
        <Message
          type="success"
          text="Category updated successfully."
        />
      ) : null}

      {query.success === "deleted" ? (
        <Message
          type="success"
          text="Category deleted successfully."
        />
      ) : null}

      {query.error ? (
        <Message
          type="error"
          text={query.error}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Categories"
          value={items.length}
          icon="🗂️"
        />

        <StatCard
          label="Active"
          value={active}
          icon="✅"
        />

        <StatCard
          label="Inactive"
          value={inactive}
          icon="⛔"
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Unable to load categories: {error.message}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-extrabold text-slate-900">
            Category Directory
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Categories are ordered by sort order and then name.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🗂️
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No categories found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Create your first category to organize website content.
            </p>

            <Link
              href="/admin/categories/new"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              + Add Category
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Category
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Slug
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Order
                    </th>

                    <th className="px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-right text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((category) => (
                    <tr
                      key={category.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg"
                          >
                            {category.icon || "🗂️"}
                          </div>

                          <div className="min-w-0">
                            <p className="text-sm font-extrabold text-slate-800">
                              {category.name}
                            </p>

                            {category.description ? (
                              <p className="mt-1 max-w-[380px] truncate text-xs text-slate-500">
                                {category.description}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                          {category.slug}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm font-extrabold text-slate-700">
                          {category.sort_order}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {category.is_active ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/admin/categories/${category.id}`}
                          className="inline-flex rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 hover:bg-slate-50 hover:text-blue-700"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {items.map((category) => (
                <div
                  key={category.id}
                  className="p-5"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
                      {category.icon || "🗂️"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-extrabold text-slate-800">
                            {category.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {category.slug}
                          </p>
                        </div>

                        {category.is_active ? (
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-extrabold text-emerald-700">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-extrabold text-slate-600">
                            INACTIVE
                          </span>
                        )}
                      </div>

                      {category.description ? (
                        <p className="mt-3 text-xs leading-5 text-slate-500">
                          {category.description}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <Link
                    href={`/admin/categories/${category.id}`}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600 hover:bg-slate-50"
                  >
                    Manage Category
                  </Link>
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

function Message({
  type,
  text,
}: {
  type: "success" | "error";
  text: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-sm font-semibold ${
        type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {text}
    </div>
  );
}