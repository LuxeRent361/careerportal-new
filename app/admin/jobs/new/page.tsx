import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

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

async function createJob(
  formData: FormData
) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/jobs/new");
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

  const job = {
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
    .insert(job);

  if (error) {
    throw new Error(
      `Unable to create job: ${error.message}`
    );
  }

  revalidatePath("/jobs");
  revalidatePath("/admin/jobs");
  revalidatePath("/");

  redirect("/admin/jobs");
}

export default async function NewJobPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/jobs/new");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-extrabold text-blue-700">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            GOVERNMENT JOBS
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Add New Job
          </h1>

          <p className="mt-1 text-sm leading-6 text-slate-500">
            Add a complete government job notification
            to CareerPortal.
          </p>
        </div>

        <Link
          href="/admin/jobs"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          ← Back to Jobs
        </Link>
      </div>

      <form
        action={createJob}
        className="space-y-6"
      >
        {/* Basic Information */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">
              Basic Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Main details of the recruitment.
            </p>
          </div>

          <div className="grid gap-5">
            <Field
              label="Job Title"
              name="title"
              placeholder="Example: SSC CGL 2026"
              required
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Field
                label="Organization"
                name="organization"
                placeholder="Example: Staff Selection Commission"
                required
              />

              <Field
                label="Location"
                name="location"
                placeholder="Example: All India"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <SelectField
                label="Category"
                name="category"
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
              placeholder="Example: Graduation from a recognized university"
            />

            <TextareaField
              label="Job Description"
              name="description"
              placeholder="Write the important details of the recruitment, eligibility, selection process, important instructions, etc."
              rows={7}
            />
          </div>
        </section>

        {/* Recruitment Details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">
              Recruitment Details
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Vacancy, age, salary and application details.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Total Vacancies"
              name="vacancies"
              type="number"
              placeholder="Example: 1500"
              min="0"
            />

            <Field
              label="Age Limit"
              name="age_limit"
              placeholder="Example: 18-30 years"
            />

            <Field
              label="Salary / Pay Scale"
              name="salary"
              placeholder="Example: ₹25,500 - ₹81,100"
            />

            <Field
              label="Application Fee"
              name="application_fee"
              placeholder="Example: General ₹100 / SC-ST ₹0"
            />
          </div>
        </section>

        {/* Important Dates */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">
              Important Dates
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Application and examination schedule.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <DateField
              label="Application Start Date"
              name="application_start"
            />

            <DateField
              label="Last Date to Apply"
              name="last_date"
            />

            <DateField
              label="Exam Date"
              name="exam_date"
            />

            <DateField
              label="Expiry Date"
              name="expiry_date"
            />
          </div>

          <div className="mt-4 rounded-xl bg-blue-50 p-4 text-xs leading-5 text-blue-700">
            <strong>Expiry Date:</strong> After this date,
            the job should no longer be treated as an active
            opportunity on the public website.
          </div>
        </section>

        {/* Official Links */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-extrabold text-slate-900">
              Official Links
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Use official government URLs wherever possible.
            </p>
          </div>

          <div className="grid gap-5">
            <Field
              label="Official Website"
              name="official_website"
              type="url"
              placeholder="https://example.gov.in"
            />

            <Field
              label="Official Notification URL"
              name="notification_url"
              type="url"
              placeholder="https://example.gov.in/notification.pdf"
            />

            <Field
              label="Apply Online URL"
              name="apply_url"
              type="url"
              placeholder="https://example.gov.in/apply"
            />
          </div>
        </section>

        {/* Publishing */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start gap-4">
            <input
              id="is_published"
              name="is_published"
              type="checkbox"
              defaultChecked
              className="mt-1 h-5 w-5 rounded border-slate-300 accent-blue-600"
            />

            <div>
              <label
                htmlFor="is_published"
                className="block cursor-pointer text-sm font-extrabold text-slate-900"
              >
                Publish this job immediately
              </label>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                If enabled, the job will be available on
                the public Jobs section after saving.
              </p>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/admin/jobs"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
          >
            Save Job
          </button>
        </div>
      </form>
    </section>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  min,
}: {
  label: string;
  name: string;
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
}: {
  label: string;
  name: string;
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
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
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
        defaultValue=""
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
  placeholder,
  rows,
}: {
  label: string;
  name: string;
  placeholder?: string;
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
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </div>
  );
}