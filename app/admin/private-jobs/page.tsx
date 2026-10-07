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
  title: string;
  slug: string | null;
  company_name: string | null;
  location: string | null;
  category_id: string | null;
  job_type: string | null;
  employment_type: string | null;
  qualification: string | null;
  experience: string | null;
  salary: string | null;
  vacancies: string | null;
  description: string | null;
  responsibilities: string | null;
  requirements: string | null;
  benefits: string | null;
  how_to_apply: string | null;
  company_website: string | null;
  apply_url: string | null;
  last_date: string | null;
  expiry_date: string | null;
  is_featured: boolean;
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

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function deleteJob(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/private-jobs");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

  if (!id) {
    redirect("/admin/private-jobs?error=Job%20ID%20is%20missing");
  }

  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("private_jobs")
    .select("id,title,slug")
    .eq("id", id)
    .maybeSingle();

  if (!job) {
    redirect("/admin/private-jobs?error=Job%20not%20found");
  }

  const { error } = await supabase
    .from("private_jobs")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/private-jobs?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "delete",
    entity_type: "private_job",
    entity_id: id,
    description: `Deleted private job: ${job.title}`,
    metadata: {
      title: job.title,
      slug: job.slug,
    },
  });

  redirect("/admin/private-jobs?deleted=1");
}

async function togglePublish(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/private-jobs");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

  const supabase = createAdminClient();

  const { data: job, error: fetchError } = await supabase
    .from("private_jobs")
    .select("id,title,is_published")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !job) {
    redirect(
      `/admin/private-jobs?error=${encodeURIComponent(
        fetchError?.message || "Job not found"
      )}`
    );
  }

  const nextValue = !job.is_published;

  const { error } = await supabase
    .from("private_jobs")
    .update({
      is_published: nextValue,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/private-jobs?error=${encodeURIComponent(error.message)}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "publish_toggle",
    entity_type: "private_job",
    entity_id: id,
    description: `${
      nextValue ? "Published" : "Unpublished"
    } private job: ${job.title}`,
    metadata: {
      is_published: nextValue,
    },
  });

  redirect("/admin/private-jobs?saved=1");
}

export default async function PrivateJobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    category?: string;
    deleted?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/private-jobs");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;
  const supabase = createAdminClient();

  const [{ data: jobs, error }, { data: categories }] =
    await Promise.all([
      supabase
        .from("private_jobs")
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

  const allJobs = (jobs || []) as Job[];
  const allCategories = (categories || []) as Category[];

  const query = String(params.q || "").trim().toLowerCase();
  const status = String(params.status || "").trim();
  const category = String(params.category || "").trim();

  let filtered = [...allJobs];

  if (query) {
    filtered = filtered.filter((job) =>
      [
        job.title,
        job.company_name,
        job.location,
        job.qualification,
        job.experience,
        job.job_type,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }

  if (status === "published") {
    filtered = filtered.filter((job) => job.is_published);
  }

  if (status === "draft") {
    filtered = filtered.filter((job) => !job.is_published);
  }

  if (category) {
    filtered = filtered.filter(
      (job) => job.category_id === category
    );
  }

  const published = allJobs.filter(
    (job) => job.is_published
  ).length;

  const featured = allJobs.filter(
    (job) => job.is_featured
  ).length;

  const drafts = allJobs.length - published;

  const expired = allJobs.filter((job) => {
    if (!job.expiry_date) return false;

    return new Date(job.expiry_date) < new Date();
  }).length;

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Private Jobs
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Manage private-sector jobs, company information, requirements,
            salary, application links and publication status.
          </p>
        </div>

        <Link
          href="/admin/private-jobs/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
        >
          + Add Private Job
        </Link>
      </div>

      {params.saved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Private job updated successfully.
        </div>
      )}

      {params.deleted && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Private job deleted successfully.
        </div>
      )}

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {params.error}
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Jobs"
          value={allJobs.length}
          icon="🏢"
        />

        <StatCard
          label="Published"
          value={published}
          icon="🌐"
        />

        <StatCard
          label="Featured"
          value={featured}
          icon="⭐"
        />

        <StatCard
          label="Expired"
          value={expired}
          icon="⏰"
        />
      </div>

      <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form
          method="GET"
          className="grid gap-3 lg:grid-cols-[1fr_180px_220px_auto]"
        >
          <input
            name="q"
            defaultValue={params.q || ""}
            placeholder="Search job, company, location..."
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
          </select>

          <select
            name="category"
            defaultValue={params.category || ""}
            className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">All Categories</option>

            {allCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
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
              href="/admin/private-jobs"
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
            Private Job Listings
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Showing {filtered.length} of {allJobs.length} jobs
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🏢
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No private jobs found
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Add a private job or change your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Job
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Company
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Location
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Salary
                    </th>

                    <th className="px-5 py-3 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      Last Date
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
                  {filtered.map((job) => (
                    <tr
                      key={job.id}
                      className="hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="max-w-[260px]">
                          <p className="truncate text-sm font-extrabold text-slate-900">
                            {job.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {job.job_type || "Private Job"}
                          </p>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm font-bold text-slate-700">
                        {job.company_name || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {job.location || "—"}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                        {job.salary || "—"}
                      </td>

                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">
                        {formatDate(job.last_date)}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${
                            job.is_published
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-100 text-slate-600"
                          }`}
                        >
                          {job.is_published
                            ? "Published"
                            : "Draft"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/private-jobs/${job.id}`}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </Link>

                          <form action={togglePublish}>
                            <input
                              type="hidden"
                              name="id"
                              value={job.id}
                            />

                            <button
                              type="submit"
                              className={`rounded-lg px-3 py-2 text-xs font-extrabold ${
                                job.is_published
                                  ? "bg-amber-50 text-amber-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {job.is_published
                                ? "Unpublish"
                                : "Publish"}
                            </button>
                          </form>

                          <form action={deleteJob}>
                            <input
                              type="hidden"
                              name="id"
                              value={job.id}
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
              {filtered.map((job) => (
                <article
                  key={job.id}
                  className="p-4 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        {job.title}
                      </h3>

                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {job.company_name || "Company not specified"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-extrabold ${
                        job.is_published
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-600"
                      }`}
                    >
                      {job.is_published
                        ? "Published"
                        : "Draft"}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Info
                      label="Location"
                      value={job.location || "—"}
                    />

                    <Info
                      label="Salary"
                      value={job.salary || "—"}
                    />

                    <Info
                      label="Job Type"
                      value={job.job_type || "—"}
                    />

                    <Info
                      label="Last Date"
                      value={formatDate(job.last_date)}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Link
                      href={`/admin/private-jobs/${job.id}`}
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-700"
                    >
                      Edit
                    </Link>

                    <form action={togglePublish}>
                      <input
                        type="hidden"
                        name="id"
                        value={job.id}
                      />

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-blue-50 px-3 py-2.5 text-xs font-extrabold text-blue-700"
                      >
                        {job.is_published
                          ? "Unpublish"
                          : "Publish"}
                      </button>
                    </form>

                    <form action={deleteJob}>
                      <input
                        type="hidden"
                        name="id"
                        value={job.id}
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