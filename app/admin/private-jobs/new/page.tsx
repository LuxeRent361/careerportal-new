import Link from "next/link";
import { redirect } from "next/navigation";
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

async function createPrivateJob(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/private-jobs/new");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const title = String(formData.get("title") || "").trim();

  if (!title) {
    redirect(
      "/admin/private-jobs/new?error=Job%20title%20is%20required"
    );
  }

  const slugInput = String(
    formData.get("slug") || ""
  ).trim();

  const slug = makeSlug(slugInput || title);

  if (!slug) {
    redirect(
      "/admin/private-jobs/new?error=Valid%20slug%20is%20required"
    );
  }

  const supabase = createAdminClient();

  const { data: duplicate } = await supabase
    .from("private_jobs")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (duplicate) {
    redirect(
      `/admin/private-jobs/new?error=${encodeURIComponent(
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
  };

  const { data, error } = await supabase
    .from("private_jobs")
    .insert(payload)
    .select("id,title,slug")
    .single();

  if (error) {
    redirect(
      `/admin/private-jobs/new?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "create",
    entity_type: "private_job",
    entity_id: data.id,
    description: `Created private job: ${data.title}`,
    metadata: {
      slug: data.slug,
      is_published: payload.is_published,
      is_featured: payload.is_featured,
    },
  });

  redirect(`/admin/private-jobs/${data.id}?created=1`);
}

export default async function NewPrivateJobPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/private-jobs/new");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;

  const supabase = createAdminClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id,name")
    .eq("is_active", true)
    .order("sort_order");

  if (error) {
    throw new Error(error.message);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Add Private Job
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add a complete private-sector job listing with company,
            eligibility, salary and application information.
          </p>
        </div>

        <Link
          href="/admin/private-jobs"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Back to Private Jobs
        </Link>
      </div>

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {params.error}
        </div>
      )}

      <form
        action={createPrivateJob}
        className="mt-7 space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Basic Information"
            title="Job Details"
            description="Enter the main information that users will see first."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Job Title"
              name="title"
              required
              placeholder="e.g. Software Developer"
            />

            <Field
              label="Slug"
              name="slug"
              placeholder="software-developer"
            />

            <Field
              label="Company Name"
              name="company_name"
              placeholder="Company name"
            />

            <Field
              label="Location"
              name="location"
              placeholder="Delhi / Mumbai / Remote"
            />

            <SelectField
              label="Category"
              name="category_id"
              options={(categories || []) as Category[]}
            />

            <Field
              label="Job Type"
              name="job_type"
              placeholder="IT / Sales / Marketing / Support"
            />

            <Field
              label="Employment Type"
              name="employment_type"
              placeholder="Full Time / Part Time / Contract"
            />

            <Field
              label="Qualification"
              name="qualification"
              placeholder="12th Pass / Graduate / B.Tech"
            />

            <Field
              label="Experience"
              name="experience"
              placeholder="Fresher / 1-3 Years"
            />

            <Field
              label="Salary"
              name="salary"
              placeholder="₹20,000 - ₹40,000"
            />

            <Field
              label="Vacancies"
              name="vacancies"
              placeholder="50"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Description"
            title="Job Information"
            description="Provide useful original information for applicants."
          />

          <div className="mt-6 space-y-5">
            <TextArea
              label="Description"
              name="description"
              rows={7}
              placeholder="Write a detailed job description..."
            />

            <TextArea
              label="Responsibilities"
              name="responsibilities"
              rows={7}
              placeholder="List the main responsibilities..."
            />

            <TextArea
              label="Requirements"
              name="requirements"
              rows={7}
              placeholder="List candidate requirements..."
            />

            <TextArea
              label="Benefits"
              name="benefits"
              rows={6}
              placeholder="Salary benefits, insurance, incentives, leave etc."
            />

            <TextArea
              label="How to Apply"
              name="how_to_apply"
              rows={6}
              placeholder="Explain the application process..."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Application"
            title="Links & Dates"
            description="Add official company and application links."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Company Website"
              name="company_website"
              placeholder="https://company.com"
              type="url"
            />

            <Field
              label="Apply URL"
              name="apply_url"
              placeholder="https://company.com/apply"
              type="url"
            />

            <Field
              label="Last Date"
              name="last_date"
              type="date"
            />

            <Field
              label="Expiry Date"
              name="expiry_date"
              type="date"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Publishing"
            title="Visibility"
            description="Choose how this job should appear on the website."
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Checkbox
              name="is_featured"
              title="Featured Job"
              description="Highlight this job in featured sections."
            />

            <Checkbox
              name="is_published"
              title="Publish Job"
              description="Make this job visible on the public website."
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
            Create Private Job
          </button>
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
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
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
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: Category[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <select
        name={name}
        defaultValue=""
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
      >
        <option value="">Select category</option>

        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
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
  placeholder,
}: {
  label: string;
  name: string;
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
}: {
  name: string;
  title: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <input
        type="checkbox"
        name={name}
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