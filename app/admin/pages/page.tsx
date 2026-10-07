import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type PageRow = {
  id: string;
  title: string;
  slug: string;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function createPage(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/pages");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const title = String(formData.get("title") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const metaTitle = String(
    formData.get("meta_title") || ""
  ).trim();
  const metaDescription = String(
    formData.get("meta_description") || ""
  ).trim();

  const isPublished =
    formData.get("is_published") === "on";

  if (!title) {
    redirect(
      "/admin/pages?error=Page%20title%20is%20required"
    );
  }

  const slug = makeSlug(slugInput || title);

  if (!slug) {
    redirect(
      "/admin/pages?error=Please%20enter%20a%20valid%20slug"
    );
  }

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("pages")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    redirect(
      `/admin/pages?error=${encodeURIComponent(
        `A page with slug "${slug}" already exists.`
      )}`
    );
  }

  const { data, error } = await supabase
    .from("pages")
    .insert({
      title,
      slug,
      content: content || null,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      is_published: isPublished,
    })
    .select("id")
    .single();

  if (error) {
    redirect(
      `/admin/pages?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "create",
    entity_type: "page",
    entity_id: data?.id ?? null,
    description: `Created page: ${title}`,
    metadata: {
      title,
      slug,
      is_published: isPublished,
    },
  });

  redirect("/admin/pages?saved=1");
}

async function updatePage(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/pages");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const metaTitle = String(
    formData.get("meta_title") || ""
  ).trim();
  const metaDescription = String(
    formData.get("meta_description") || ""
  ).trim();

  const isPublished =
    formData.get("is_published") === "on";

  if (!id) {
    redirect(
      "/admin/pages?error=Page%20ID%20is%20missing"
    );
  }

  if (!title) {
    redirect(
      `/admin/pages?edit=${encodeURIComponent(
        id
      )}&error=Page%20title%20is%20required`
    );
  }

  const slug = makeSlug(slugInput || title);

  if (!slug) {
    redirect(
      `/admin/pages?edit=${encodeURIComponent(
        id
      )}&error=Please%20enter%20a%20valid%20slug`
    );
  }

  const supabase = createAdminClient();

  const { data: duplicate } = await supabase
    .from("pages")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) {
    redirect(
      `/admin/pages?edit=${encodeURIComponent(
        id
      )}&error=${encodeURIComponent(
        `A page with slug "${slug}" already exists.`
      )}`
    );
  }

  const { error } = await supabase
    .from("pages")
    .update({
      title,
      slug,
      content: content || null,
      meta_title: metaTitle || null,
      meta_description: metaDescription || null,
      is_published: isPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/pages?edit=${encodeURIComponent(
        id
      )}&error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "update",
    entity_type: "page",
    entity_id: id,
    description: `Updated page: ${title}`,
    metadata: {
      title,
      slug,
      is_published: isPublished,
    },
  });

  redirect("/admin/pages?saved=1");
}

async function deletePage(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/pages");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

  if (!id) {
    redirect(
      "/admin/pages?error=Page%20ID%20is%20missing"
    );
  }

  const supabase = createAdminClient();

  const { data: page } = await supabase
    .from("pages")
    .select("id,title,slug")
    .eq("id", id)
    .maybeSingle();

  if (!page) {
    redirect(
      "/admin/pages?error=Page%20not%20found"
    );
  }

  const { error } = await supabase
    .from("pages")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/pages?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "delete",
    entity_type: "page",
    entity_id: id,
    description: `Deleted page: ${page.title}`,
    metadata: {
      title: page.title,
      slug: page.slug,
    },
  });

  redirect("/admin/pages?deleted=1");
}

async function togglePublish(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/pages");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

  if (!id) {
    redirect(
      "/admin/pages?error=Page%20ID%20is%20missing"
    );
  }

  const supabase = createAdminClient();

  const { data: page, error: pageError } =
    await supabase
      .from("pages")
      .select(
        "id,title,slug,is_published"
      )
      .eq("id", id)
      .maybeSingle();

  if (pageError) {
    redirect(
      `/admin/pages?error=${encodeURIComponent(
        pageError.message
      )}`
    );
  }

  if (!page) {
    redirect(
      "/admin/pages?error=Page%20not%20found"
    );
  }

  const nextPublished = !page.is_published;

  const { error } = await supabase
    .from("pages")
    .update({
      is_published: nextPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/pages?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "publish_toggle",
    entity_type: "page",
    entity_id: id,
    description: `${
      nextPublished ? "Published" : "Unpublished"
    } page: ${page.title}`,
    metadata: {
      slug: page.slug,
      is_published: nextPublished,
    },
  });

  redirect("/admin/pages?saved=1");
}

export default async function PagesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    edit?: string;
    saved?: string;
    deleted?: string;
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/pages");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("pages")
    .select(
      "id,title,slug,content,meta_title,meta_description,is_published,created_at,updated_at"
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const allPages = (data || []) as PageRow[];

  const query = String(params.q || "")
    .trim()
    .toLowerCase();

  const status = String(params.status || "")
    .trim()
    .toLowerCase();

  let pages = [...allPages];

  if (query) {
    pages = pages.filter((page) => {
      return [
        page.title,
        page.slug,
        page.meta_title,
        page.meta_description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }

  if (status === "published") {
    pages = pages.filter(
      (page) => page.is_published
    );
  }

  if (status === "draft") {
    pages = pages.filter(
      (page) => !page.is_published
    );
  }

  const publishedCount = allPages.filter(
    (page) => page.is_published
  ).length;

  const draftCount =
    allPages.length - publishedCount;

  const editingPage = params.edit
    ? allPages.find(
        (page) => page.id === params.edit
      ) || null
    : null;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Website Pages
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage important website pages such as About, Privacy Policy,
            Terms, Disclaimer and Contact from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/pages"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            All Pages
          </Link>

          <Link
            href="/admin/pages?edit=new"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
          >
            + Add Page
          </Link>
        </div>
      </div>

      {params.saved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Page saved successfully.
        </div>
      )}

      {params.deleted && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Page deleted successfully.
        </div>
      )}

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {params.error}
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Pages"
          value={allPages.length}
          icon="📄"
        />

        <SummaryCard
          label="Published"
          value={publishedCount}
          icon="🌐"
        />

        <SummaryCard
          label="Drafts"
          value={draftCount}
          icon="📝"
        />
      </div>

      {editingPage && (
        <section className="mt-7 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
                Edit Page
              </p>

              <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                {editingPage.title}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update page content, SEO information and publication status.
              </p>
            </div>

            <Link
              href="/admin/pages"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-600 hover:bg-slate-50"
            >
              Close
            </Link>
          </div>

          <form
            action={updatePage}
            className="mt-6 space-y-5"
          >
            <input
              type="hidden"
              name="id"
              value={editingPage.id}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Page Title"
                name="title"
                defaultValue={editingPage.title}
                required
              />

              <FormField
                label="Slug"
                name="slug"
                defaultValue={editingPage.slug}
                required
              />
            </div>

            <TextAreaField
              label="Page Content"
              name="content"
              defaultValue={editingPage.content || ""}
              rows={14}
              placeholder="Write the complete page content..."
            />

            <div className="grid gap-5 md:grid-cols-2">
              <FormField
                label="Meta Title"
                name="meta_title"
                defaultValue={
                  editingPage.meta_title || ""
                }
              />

              <FormField
                label="Meta Description"
                name="meta_description"
                defaultValue={
                  editingPage.meta_description || ""
                }
              />
            </div>

            <PublishCheckbox
              defaultChecked={
                editingPage.is_published
              }
            />

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/admin/pages"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-extrabold text-white hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <form
          method="GET"
          className="grid gap-3 lg:grid-cols-[1fr_200px_auto]"
        >
          <input
            name="q"
            defaultValue={params.q || ""}
            placeholder="Search page title, slug or SEO..."
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
          />

          <select
            name="status"
            defaultValue={params.status || ""}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Statuses</option>
            <option value="published">
              Published
            </option>
            <option value="draft">Draft</option>
          </select>

          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Search
            </button>

            <Link
              href="/admin/pages"
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
            Pages
          </h2>

          <p className="mt-1 text-xs font-medium text-slate-500">
            Showing {pages.length} of {allPages.length} pages
          </p>
        </div>

        {pages.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              📄
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No pages found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Create your first website page or change the search filters.
            </p>

            <Link
              href="/admin/pages?edit=new"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Create Page
            </Link>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Page
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Slug
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Updated
                    </th>

                    <th className="px-5 py-3 text-right text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {pages.map((page) => (
                    <tr
                      key={page.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-extrabold text-slate-900">
                          {page.title}
                        </p>

                        <p className="mt-1 max-w-[350px] truncate text-xs text-slate-400">
                          {page.meta_title ||
                            "No meta title"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                          /{page.slug}
                        </code>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          published={
                            page.is_published
                          }
                        />
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(
                          page.updated_at ||
                            page.created_at
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/pages?edit=${page.id}`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </Link>

                          {page.is_published && (
                            <Link
                              href={`/${page.slug}`}
                              target="_blank"
                              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-blue-700 hover:bg-blue-50"
                            >
                              View
                            </Link>
                          )}

                          <form
                            action={
                              togglePublish
                            }
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={page.id}
                            />

                            <button
                              type="submit"
                              className={`rounded-lg px-3 py-2 text-xs font-extrabold ${
                                page.is_published
                                  ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              {page.is_published
                                ? "Unpublish"
                                : "Publish"}
                            </button>
                          </form>

                          <form
                            action={deletePage}
                          >
                            <input
                              type="hidden"
                              name="id"
                              value={page.id}
                            />

                            <button
                              type="submit"
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700 hover:bg-red-100"
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
              {pages.map((page) => (
                <article
                  key={page.id}
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {page.title}
                      </h3>

                      <p className="mt-1 break-all text-xs font-medium text-slate-400">
                        /{page.slug}
                      </p>
                    </div>

                    <StatusBadge
                      published={
                        page.is_published
                      }
                    />
                  </div>

                  {page.meta_description && (
                    <p className="mt-4 line-clamp-2 text-xs leading-5 text-slate-500">
                      {page.meta_description}
                    </p>
                  )}

                  <div className="mt-4 rounded-xl bg-slate-50 p-3">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Last Updated
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      {formatDate(
                        page.updated_at ||
                          page.created_at
                      )}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <Link
                      href={`/admin/pages?edit=${page.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-extrabold text-slate-700"
                    >
                      Edit
                    </Link>

                    {page.is_published ? (
                      <Link
                        href={`/${page.slug}`}
                        target="_blank"
                        className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-extrabold text-blue-700"
                      >
                        View
                      </Link>
                    ) : (
                      <span className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-extrabold text-slate-400">
                        Draft
                      </span>
                    )}

                    <form
                      action={togglePublish}
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={page.id}
                      />

                      <button
                        type="submit"
                        className={`w-full rounded-xl px-3 py-2.5 text-xs font-extrabold ${
                          page.is_published
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {page.is_published
                          ? "Unpublish"
                          : "Publish"}
                      </button>
                    </form>

                    <form
                      action={deletePage}
                    >
                      <input
                        type="hidden"
                        name="id"
                        value={page.id}
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

      {!editingPage && (
        <section className="mt-7 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">
              📄
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-blue-900">
                Recommended website pages
              </h3>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                For a professional and AdSense-ready website, maintain
                useful pages such as About Us, Contact Us, Privacy Policy,
                Terms & Conditions, Disclaimer and other genuinely useful
                informational pages.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
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

function FormField({
  label,
  name,
  defaultValue,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </span>

      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  rows,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue: string;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function PublishCheckbox({
  defaultChecked,
}: {
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <input
        type="checkbox"
        name="is_published"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />

      <span>
        <span className="block text-sm font-extrabold text-slate-800">
          Publish this page
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          Published pages can be displayed on the public website.
        </span>
      </span>
    </label>
  );
}

function StatusBadge({
  published,
}: {
  published: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${
        published
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}