import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  title: string | null;
  organization: string | null;
  location: string | null;
  qualification: string | null;
  type: string | null;
  category: string | null;
  description: string | null;
  vacancies: number | null;
  age_limit: string | null;
  salary: string | null;
  application_fee: string | null;
  job_type: string | null;
  application_start: string | null;
  last_date: string | null;
  exam_date: string | null;
  official_website: string | null;
  notification_url: string | null;
  apply_url: string | null;
  expiry_date: string | null;
  is_published: boolean | null;
};

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase environment variables are missing."
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function textValue(
  formData: FormData,
  name: string
) {
  const value = formData.get(name);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function nullableText(
  formData: FormData,
  name: string
) {
  const value = textValue(formData, name);

  return value || null;
}

function nullableNumber(
  formData: FormData,
  name: string
) {
  const value = textValue(formData, name);

  if (!value) return null;

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

function nullableDate(
  formData: FormData,
  name: string
) {
  const value = textValue(formData, name);

  return value || null;
}

function dateInputValue(value: string | null) {
  if (!value) return "";

  return value.slice(0, 10);
}

async function updateJob(
  jobId: string,
  formData: FormData
) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/admin/jobs/${jobId}`);
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const title = textValue(formData, "title");
  const organization = textValue(
    formData,
    "organization"
  );

  if (!title) {
    throw new Error("Job title is required.");
  }

  if (!organization) {
    throw new Error(
      "Organization name is required."
    );
  }

  const supabase = createAdminClient();

  const updateData = {
    title,
    organization,
    location: nullableText(formData, "location"),
    qualification: nullableText(
      formData,
      "qualification"
    ),
    type: nullableText(formData, "type"),
    category: nullableText(
      formData,
      "category"
    ),
    description: nullableText(
      formData,
      "description"
    ),
    vacancies: nullableNumber(
      formData,
      "vacancies"
    ),
    age_limit: nullableText(
      formData,
      "age_limit"
    ),
    salary: nullableText(
      formData,
      "salary"
    ),
    application_fee: nullableText(
      formData,
      "application_fee"
    ),
    job_type: nullableText(
      formData,
      "job_type"
    ),
    application_start: nullableDate(
      formData,
      "application_start"
    ),
    last_date: nullableDate(
      formData,
      "last_date"
    ),
    exam_date: nullableDate(
      formData,
      "exam_date"
    ),
    official_website: nullableText(
      formData,
      "official_website"
    ),
    notification_url: nullableText(
      formData,
      "notification_url"
    ),
    apply_url: nullableText(
      formData,
      "apply_url"
    ),
    expiry_date: nullableDate(
      formData,
      "expiry_date"
    ),
    is_published:
      formData.get("is_published") === "on",
  };

  const { error } = await supabase
    .from("jobs")
    .update(updateData)
    .eq("id", jobId);

  if (error) {
    throw new Error(
      `Unable to update job: ${error.message}`
    );
  }

  revalidatePath("/jobs");
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath("/");

  redirect(`/admin/jobs/${jobId}`);
}

async function deleteJob(jobId: string) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/admin/jobs/${jobId}`);
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("jobs")
    .delete()
    .eq("id", jobId);

  if (error) {
    throw new Error(
      `Unable to delete job: ${error.message}`
    );
  }

  revalidatePath("/jobs");
  revalidatePath("/admin/jobs");
  revalidatePath("/");

  redirect("/admin/jobs");
}

export default async function ManageJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/jobs");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const { id } = await params;

  const supabase = createAdminClient();

  const { data: job, error } = await supabase
    .from("jobs")
    .select(`
      id,
      title,
      organization,
      location,
      qualification,
      type,
      category,
      description,
      vacancies,
      age_limit,
      salary,
      application_fee,
      job_type,
      application_start,
      last_date,
      exam_date,
      official_website,
      notification_url,
      apply_url,
      expiry_date,
      is_published
    `)
    .eq("id", id)
    .maybeSingle();

  if (error || !job) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-xl text-red-600">
            !
          </div>

          <h1 className="mt-4 text-xl font-extrabold text-slate-900">
            Job not found
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error?.message ||
              "The requested job does not exist or has been removed."}
          </p>

          <Link
            href="/admin/jobs"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
          >
            ← Back to Jobs
          </Link>
        </div>
      </section>
    );
  }

  const currentJob = job as Job;

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            JOB MANAGEMENT
          </div>

          <h1 className="max-w-3xl text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {currentJob.title || "Untitled Job"}
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {currentJob.organization ||
              "Organization not specified"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/jobs"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            ← Jobs
          </Link>

          {currentJob.is_published ? (
            <span className="inline-flex items-center rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-extrabold text-emerald-700">
              ● Published
            </span>
          ) : (
            <span className="inline-flex items-center rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-extrabold text-amber-700">
              ● Draft
            </span>
          )}
        </div>
      </div>

      {/* Edit Form */}
      <form
        action={updateJob.bind(null, currentJob.id)}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">
              Basic Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Update the main recruitment information.
            </p>
          </div>

          <div className="grid gap-5">
            <Field
              label="Job Title"
              name="title"
              defaultValue={currentJob.title}
              required
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Organization"
                name="organization"
                defaultValue={currentJob.organization}
                required
              />

              <Field
                label="Location"
                name="location"
                defaultValue={currentJob.location}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <SelectField
                label="Category"
                name="category"
                defaultValue={currentJob.category}
                options={[
                  "Government",
                  "Railway",
                  "SSC",
                  "UPSC",
                  "Banking",
                  "Teaching",
                  "Defence",
                  "Police",
                  "Healthcare",
                  "Other",
                ]}
              />

              <SelectField
                label="Job Type"
                name="job_type"
                defaultValue={currentJob.job_type}
                options={[
                  "Full Time",
                  "Part Time",
                  "Contract",
                  "Permanent",
                  "Temporary",
                ]}
              />

              <SelectField
                label="Recruitment Type"
                name="type"
                defaultValue={currentJob.type}
                options={[
                  "Recruitment",
                  "Direct Recruitment",
                  "Online Form",
                  "Apprentice",
                  "Other",
                ]}
              />
            </div>

            <Field
              label="Qualification"
              name="qualification"
              defaultValue={currentJob.qualification}
            />

            <TextareaField
              label="Job Description"
              name="description"
              defaultValue={currentJob.description}
              rows={8}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">
              Recruitment Details
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Total Vacancies"
              name="vacancies"
              type="number"
              defaultValue={
                currentJob.vacancies !== null
                  ? String(currentJob.vacancies)
                  : ""
              }
              min="0"
            />

            <Field
              label="Age Limit"
              name="age_limit"
              defaultValue={currentJob.age_limit}
            />

            <Field
              label="Salary / Pay Scale"
              name="salary"
              defaultValue={currentJob.salary}
            />

            <Field
              label="Application Fee"
              name="application_fee"
              defaultValue={currentJob.application_fee}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">
              Important Dates
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <DateField
              label="Application Start Date"
              name="application_start"
              defaultValue={currentJob.application_start}
            />

            <DateField
              label="Last Date to Apply"
              name="last_date"
              defaultValue={currentJob.last_date}
            />

            <DateField
              label="Exam Date"
              name="exam_date"
              defaultValue={currentJob.exam_date}
            />

            <DateField
              label="Expiry Date"
              name="expiry_date"
              defaultValue={currentJob.expiry_date}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">
              Official Links
            </h2>
          </div>

          <div className="grid gap-5">
            <Field
              label="Official Website"
              name="official_website"
              type="url"
              defaultValue={currentJob.official_website}
            />

            <Field
              label="Official Notification URL"
              name="notification_url"
              type="url"
              defaultValue={currentJob.notification_url}
            />

            <Field
              label="Apply Online URL"
              name="apply_url"
              type="url"
              defaultValue={currentJob.apply_url}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <input
              id="is_published"
              name="is_published"
              type="checkbox"
              defaultChecked={Boolean(
                currentJob.is_published
              )}
              className="mt-1 h-5 w-5 rounded border-slate-300 accent-blue-600"
            />

            <div>
              <label
                htmlFor="is_published"
                className="cursor-pointer text-sm font-extrabold text-slate-900"
              >
                Publish this job
              </label>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Published jobs can appear on the public
                Jobs section, subject to the public
                page's active/expiry rules.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="submit"
            formAction={deleteJob.bind(
              null,
              currentJob.id
            )}
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
          >
            Delete Job
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/jobs"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  type = "text",
  required = false,
  min,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        id={name}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        required={required}
        min={min}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

function DateField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        type="date"
        defaultValue={dateInputValue(
          defaultValue ?? null
        )}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  options: string[];
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      >
        <option value="">
          Select {label}
        </option>

        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextareaField({
  label,
  name,
  defaultValue,
  rows,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows: number;
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-bold text-slate-700"
      >
        {label}
      </label>

      <textarea
        id={name}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}