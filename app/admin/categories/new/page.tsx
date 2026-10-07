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

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/categories/new");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const query = await searchParams;

  async function createCategory(formData: FormData) {
    "use server";

    const loggedInUser = await getCurrentUser();

    if (!loggedInUser) {
      redirect("/login?next=/admin/categories/new");
    }

    const loggedInAdmin = await getCurrentAdmin();

    if (!loggedInAdmin) {
      redirect("/profile");
    }

    const name = String(
      formData.get("name") || ""
    ).trim();

    const slugInput = String(
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
        "/admin/categories/new?error=Name is required."
      );
    }

    const slug =
      slugInput ||
      createSlug(name);

    if (!slug) {
      redirect(
        "/admin/categories/new?error=Could not generate slug."
      );
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      redirect(
        "/admin/categories/new?error=This slug already exists."
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        name,
        slug,
        description: description || null,
        icon: icon || null,
        color: color || null,
        sort_order: Number.isFinite(sortOrderValue)
          ? sortOrderValue
          : 0,
        is_active: isActive,
      })
      .select("id,name")
      .single();

    if (error) {
      console.error(
        "Create category error:",
        error
      );

      redirect(
        `/admin/categories/new?error=${encodeURIComponent(
          error.message
        )}`
      );
    }

    await supabase.from("activity_logs").insert({
      actor_user_id: loggedInUser.id,
      actor_email: loggedInUser.email,
      action: "category_created",
      entity_type: "category",
      entity_id: data.id,
      description:
        `Category "${data.name}" was created.`,
      metadata: {
        slug,
        is_active: isActive,
      },
    });

    redirect(
      "/admin/categories?success=created"
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
            Add Category
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Create a category that can be assigned to website content.
          </p>
        </div>

        <Link
          href="/admin/categories"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
        >
          ← Back
        </Link>
      </div>

      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {query.error}
        </div>
      ) : null}

      <form
        action={createCategory}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Category Information
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Basic information used throughout CareerPortal.
            </p>
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
                placeholder="Government Jobs"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <div>
              <label
                htmlFor="slug"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Slug
              </label>

              <input
                id="slug"
                name="slug"
                placeholder="government-jobs"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

              <p className="mt-1.5 text-[10px] text-slate-400">
                Leave empty to generate from category name.
              </p>
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
                defaultValue="0"
                min="0"
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
                placeholder="💼"
                maxLength={20}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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
                placeholder="#2563EB"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
              />

              <p className="mt-1.5 text-[10px] text-slate-400">
                Optional color value for future category styling.
              </p>
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
                placeholder="Short description of this category..."
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
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
              defaultChecked
              className="mt-1 h-4 w-4 rounded accent-blue-600"
            />

            <span>
              <span className="block text-sm font-extrabold text-slate-800">
                Active Category
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Active categories can be selected while creating or
                editing content.
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
            Create Category
          </button>
        </div>
      </form>
    </div>
  );
}

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}