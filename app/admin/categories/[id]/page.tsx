import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

export default async function EditCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
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

  const { id } = await params;
  const query = await searchParams;

  const supabase = createAdminClient();

  const { data: category, error } = await supabase
    .from("categories")
    .select(
      "id,name,slug,description,icon,color,sort_order,is_active,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "Load category error:",
      error
    );
  }

  if (!category) {
    notFound();
  }

  async function updateCategory(formData: FormData) {
    "use server";

    const loggedInUser = await getCurrentUser();

    if (!loggedInUser) {
      redirect(
        `/login?next=/admin/categories/${id}`
      );
    }

    const loggedInAdmin = await getCurrentAdmin();

    if (!loggedInAdmin) {
      redirect("/profile");
    }

    const name = String(
      formData.get("name") || ""
    ).trim();

    const slug = String(
      formData.get("slug") || ""
    ).trim();

    const description = String(
      formData.get("description") || ""
    ).trim();

    const icon = String(
      formData.get("icon") || ""
    ).trim();

    const color = String(
      formData.get("color") || ""
    ).trim();

    const sortOrderValue = Number(
      formData.get("sort_order") || 0
    );

    const isActive =
      String(formData.get("is_active")) === "true";

    if (!name) {
      redirect(
        `/admin/categories/${id}?error=Name is required.`
      );
    }

    if (!slug) {
      redirect(
        `/admin/categories/${id}?error=Slug is required.`
      );
    }

    const supabase = createAdminClient();

    const { data: duplicate } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .neq("id", id)
      .maybeSingle();

    if (duplicate) {
      redirect(
        `/admin/categories/${id}?error=This slug already exists.`
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .update({
        name,
        slug,
        description: description || null,
        icon: icon || null,
        color: color || null,
        sort_order: Number.isFinite(sortOrderValue)
          ? sortOrderValue
          : 0,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("id,name")
      .single();

    if (error) {
      console.error(
        "Update category error:",
        error
      );

      redirect(
        `/admin/categories/${id}?error=${encodeURIComponent(
          error.message
        )}`
      );
    }

    await supabase.from("activity_logs").insert({
      actor_user_id: loggedInUser.id,
      actor_email: loggedInUser.email,
      action: "category_updated",
      entity_type: "category",
      entity_id: data.id,
      description:
        `Category "${data.name}" was updated.`,
      metadata: {
        slug,
        is_active: isActive,
      },
    });

    redirect(
      `/admin/categories/${id}?success=updated`
    );
  }

  async function deleteCategory() {
    "use server";

    const loggedInUser = await getCurrentUser();

    if (!loggedInUser) {
      redirect("/login?next=/admin/categories");
    }

    const loggedInAdmin = await getCurrentAdmin();

    if (!loggedInAdmin) {
      redirect("/profile");
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("categories")
      .select("id,name")
      .eq("id", id)
      .maybeSingle();

    if (!existing) {
      redirect("/admin/categories");
    }

    /*
     * First check whether this category is referenced by content.
     * We do not delete the category if it is already being used.
     */
    const [
      jobs,
      privateJobs,
      exams,
      results,
      admitCards,
      education,
    ] = await Promise.all([
      supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id),

      supabase
        .from("private_jobs")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id),

      supabase
        .from("exams")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id),

      supabase
        .from("results")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id),

      supabase
        .from("admit_cards")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id),

      supabase
        .from("education")
        .select("id", { count: "exact", head: true })
        .eq("category_id", id),
    ]);

    const references =
      (jobs.count || 0) +
      (privateJobs.count || 0) +
      (exams.count || 0) +
      (results.count || 0) +
      (admitCards.count || 0) +
      (education.count || 0);

    if (references > 0) {
      redirect(
        `/admin/categories/${id}?error=This category is being used by existing content. Deactivate it instead of deleting it.`
      );
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(
        "Delete category error:",
        error
      );

      redirect(
        `/admin/categories/${id}?error=${encodeURIComponent(
          error.message
        )}`
      );
    }

    await supabase.from("activity_logs").insert({
      actor_user_id: loggedInUser.id,
      actor_email: loggedInUser.email,
      action: "category_deleted",
      entity_type: "category",
      entity_id: id,
      description:
        `Category "${existing.name}" was deleted.`,
      metadata: {
        name: existing.name,
      },
    });

    redirect(
      "/admin/categories?success=deleted"
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Manage Category
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update category details, ordering and availability.
          </p>
        </div>

        <Link
          href="/admin/categories"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
        >
          ← Back
        </Link>
      </div>

      {query.success === "updated" ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          Category updated successfully.
        </div>
      ) : null}

      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {query.error}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
            {category.icon || "🗂️"}
          </div>

          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              {category.name}
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              /{category.slug}
            </p>
          </div>
        </div>
      </section>

      <form
        action={updateCategory}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Category Information
            </h2>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="name"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Category Name *
              </label>

              <input
                id="name"
                name="name"
                required
                defaultValue={category.name}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Slug *
              </label>

              <input
                id="slug"
                name="slug"
                required
                defaultValue={category.slug}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label
                htmlFor="sort_order"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Sort Order
              </label>

              <input
                id="sort_order"
                name="sort_order"
                type="number"
                min="0"
                defaultValue={category.sort_order}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label
                htmlFor="icon"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Icon
              </label>

              <input
                id="icon"
                name="icon"
                defaultValue={category.icon || ""}
                maxLength={20}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label
                htmlFor="color"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Color
              </label>

              <input
                id="color"
                name="color"
                defaultValue={category.color || ""}
                placeholder="#2563EB"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="description"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Description
              </label>

              <textarea
                id="description"
                name="description"
                rows={5}
                defaultValue={
                  category.description || ""
                }
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              name="is_active"
              value="true"
              defaultChecked={category.is_active}
              className="mt-1 h-4 w-4 rounded accent-blue-600"
            />

            <span>
              <span className="block text-sm font-extrabold text-slate-800">
                Active Category
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Keep this category available for content management.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/categories"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </form>

      <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
        <div className="border-b border-red-100 px-5 py-4">
          <h2 className="text-base font-extrabold text-red-700">
            Danger Zone
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Delete this category only when it is not used by any
            existing content.
          </p>
        </div>

        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-extrabold text-slate-800">
              Delete Category
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              If the category is already assigned to content, the
              system will prevent deletion.
            </p>
          </div>

          <form action={deleteCategory}>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-700 hover:bg-red-100 sm:w-auto"
            >
              Delete Category
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}