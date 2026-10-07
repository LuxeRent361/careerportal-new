import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type Category = {
  id: string;
  name: string;
};

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

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function updatePrivateJob(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();
  const title = String(formData.get("title") || "").trim();

  if (!id) {
    redirect("/admin/private-jobs?error=Job%20ID%20is%20missing");
  }

  if (!title) {
    redirect(
      `/admin/private-jobs/${id}?error=Job%20title%20is%20required`
    );
  }

  const slugInput = String(
    formData.get("slug") || ""
  ).trim();

  const slug = makeSlug(slugInput || title);

  if (!slug) {
    redirect(
      `/admin/private-jobs/${id}?error=Valid%20slug%20is%20required`
    );
  }

  const supabase = createAdminClient();

  const { data: duplicate } = await supabase
    .from("private_jobs")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) {
    redirect(
      `/admin/private-jobs/${id}?error=${encodeURIComponent(
        `Slug "${slug}" already exists.`
      )}`
    );
  }

  const payload = {
    title,
    slug,
    company_name:
      String(formData.get("company_name") || "").trim() ||
      null,
    location:
      String(formData.get("location") || "").trim() ||
      null,
    category_id:
      String(formData.get("category_id") || "").trim() ||
      null,
    job_type:
      String(formData.get("job_type") || "").trim() ||
      null,
    employment_type:
      String(formData.get("employment_type") || "").trim() ||
      null,
    qualification:
      String(formData.get("qualification") || "").trim() ||
      null,
    experience:
      String(formData.get("experience") || "").trim() ||
      null,
    salary:
      String(formData.get("salary") || "").trim() ||
      null,
    vacancies:
      String(formData.get("vacancies") || "").trim() ||
      null,
    description:
      String(formData.get("description") || "").trim() ||
      null,
    responsibilities:
      String(formData.get("responsibilities") || "").trim() ||
      null,
    requirements:
      String(formData.get("requirements") || "").trim() ||
      null,
    benefits:
      String(formData.get("benefits") || "").trim() ||
      null,
    how_to_apply:
      String(formData.get("how_to_apply") || "").trim() ||
      null,
    company_website:
      String(formData.get("company_website") || "").trim() ||
      null,
    apply_url:
      String(formData.get("apply_url") || "").trim() ||
      null,
    last_date:
      String(formData.get("last_date") || "").trim() ||
      null,
    expiry_date:
      String(formData.get("expiry_date") || "").trim() ||
      null,
    is_featured:
      formData.get("is_featured") === "on",
    is_published:
      formData.get("is_published") === "on",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("private_jobs")
    .update(payload)
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/private-jobs/${id}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "update",
    entity_type: "private_job",
    entity_id: id,
    description: `Updated private job: ${title}`,
    metadata: {
      slug,
      is_published: payload.is_published,
      is_featured: payload.is_featured,
    },
  });

  redirect(`/admin/private-jobs/${id}?saved=1`);
}

async function deletePrivateJob(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

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
      `/admin/private-jobs/${id}?error=${encodeURIComponent(
        error.message
      )}`
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
      slug: job.slug,
    },
  });

  redirect("/admin/private-jobs?deleted=1");
}

export default async function PrivateJobEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    saved?: string;
    created?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const { id } = await params;
  const query = await searchParams;

  const supabase = createAdminClient();

  const [
    { data: job, error: jobError },
    { data: categories, error: categoryError },
  ] = await Promise.all([
    supabase
      .from("private_jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("categories")
      .select("id,name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (jobError) {
    throw new Error(jobError.message);
  }

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (!job) {
    notFound();
  }

  const currentJob = job as Job;
  const categoryRows = (categories || []) as Category[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Edit Private Job
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update all information for this private-sector job listing.
          </p>
        </div>

        <Link
          href="/admin/private-jobs"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Back to Private Jobs
        </Link>
      </div>

      {query.saved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Private job updated successfully.
        </div>
      )}

      {query.created && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Private job created successfully.
        </div>
      )}

      {query.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {query.error}
        </div>
      )}

      <form
        action={updatePrivateJob}
        className="mt-7 space-y-6"
      >
        <input
          type="hidden"
          name="id"
          value={currentJob.id}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Basic Information"
            title="Job Details"
            description="Update the main information for this listing."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Job Title"
              name="title"
              required
              defaultValue={currentJob.title}
            />

            <Field
              label="Slug"
              name="slug"
              required
              defaultValue={currentJob.slug || ""}
            />

            <Field
              label="Company Name"
              name="company_name"
              defaultValue={currentJob.company_name || ""}
            />

            <Field
              label="Location"
              name="location"
              defaultValue={currentJob.location || ""}
            />

            <SelectField
              label="Category"
              name="category_id"
              value={currentJob.category_id || ""}
              options={categoryRows}
            />

            <Field
              label="Job Type"
              name="job_type"
              defaultValue={currentJob.job_type || ""}
            />

            <Field
              label="Employment Type"
              name="employment_type"
              defaultValue={currentJob.employment_type || ""}
            />

            <Field
              label="Qualification"
              name="qualification"
              defaultValue={currentJob.qualification || ""}
            />

            <Field
              label="Experience"
              name="experience"
              defaultValue={currentJob.experience || ""}
            />

            <Field
              label="Salary"
              name="salary"
              defaultValue={currentJob.salary || ""}
            />

            <Field
              label="Vacancies"
              name="vacancies"
              defaultValue={currentJob.vacancies || ""}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Description"
            title="Job Information"
            description="Keep the information useful, accurate and detailed."
          />

          <div className="mt-6 space-y-5">
            <TextArea
              label="Description"
              name="description"
              rows={7}
              defaultValue={currentJob.description || ""}
            />

            <TextArea
              label="Responsibilities"
              name="responsibilities"
              rows={7}
              defaultValue={
                currentJob.responsibilities || ""
              }
            />

            <TextArea
              label="Requirements"
              name="requirements"
              rows={7}
              defaultValue={
                currentJob.requirements || ""
              }
            />

            <TextArea
              label="Benefits"
              name="benefits"
              rows={6}
              defaultValue={currentJob.benefits || ""}
            />

            <TextArea
              label="How to Apply"
              name="how_to_apply"
              rows={6}
              defaultValue={
                currentJob.how_to_apply || ""
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Application"
            title="Links & Dates"
            description="Maintain official links and application deadlines."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Company Website"
              name="company_website"
              type="url"
              defaultValue={
                currentJob.company_website || ""
              }
            />

            <Field
              label="Apply URL"
              name="apply_url"
              type="url"
              defaultValue={
                currentJob.apply_url || ""
              }
            />

            <Field
              label="Last Date"
              name="last_date"
              type="date"
              defaultValue={
                currentJob.last_date || ""
              }
            />

            <Field
              label="Expiry Date"
              name="expiry_date"
              type="date"
              defaultValue={
                currentJob.expiry_date || ""
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Publishing"
            title="Visibility"
            description="Control whether the job is featured and visible publicly."
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Checkbox
              name="is_featured"
              title="Featured Job"
              description="Highlight this job in featured areas."
              defaultChecked={currentJob.is_featured}
            />

            <Checkbox
              name="is_published"
              title="Publish Job"
              description="Make this job visible on the public website."
              defaultChecked={currentJob.is_published}
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <form action={deletePrivateJob}>
            <input
              type="hidden"
              name="id"
              value={currentJob.id}
            />

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-red-50 px-6 text-sm font-extrabold text-red-700 hover:bg-red-100"
            >
              Delete Job
            </button>
          </form>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/private-jobs"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-7 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-extrabold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue = "",
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: Category[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <select
        name={name}
        defaultValue={value}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
      >
        <option value="">Select category</option>

        {options.map((category) => (
          <option
            key={category.id}
            value={category.id}
          >
            {category.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  name,
  rows,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue: string;
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
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function Checkbox({
  name,
  title,
  description,
  defaultChecked,
}: {
  name: string;
  title: string;
  description: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
      />

      <span>
        <span className="block text-sm font-extrabold text-slate-800">
          {title}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}