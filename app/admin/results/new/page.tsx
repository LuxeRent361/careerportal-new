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

async function createResult(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/results/new");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const title = String(formData.get("title") || "").trim();

  if (!title) {
    redirect(
      "/admin/results/new?error=Result%20title%20is%20required"
    );
  }

  const slugInput = String(
    formData.get("slug") || ""
  ).trim();

  const slug = makeSlug(slugInput || title);

  if (!slug) {
    redirect(
      "/admin/results/new?error=Valid%20slug%20is%20required"
    );
  }

  const supabase = createAdminClient();

  const { data: duplicate } = await supabase
    .from("results")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (duplicate) {
    redirect(
      `/admin/results/new?error=${encodeURIComponent(
        `Slug "${slug}" already exists.`
      )}`
    );
  }

  const payload = {
    title,
    slug,
    organization:
      String(formData.get("organization") || "").trim() ||
      null,
    category_id:
      String(formData.get("category_id") || "").trim() ||
      null,
    exam_name:
      String(formData.get("exam_name") || "").trim() ||
      null,
    description:
      String(formData.get("description") || "").trim() ||
      null,
    qualification:
      String(formData.get("qualification") || "").trim() ||
      null,
    result_date:
      String(formData.get("result_date") || "").trim() ||
      null,
    expiry_date:
      String(formData.get("expiry_date") || "").trim() ||
      null,
    result_url:
      String(formData.get("result_url") || "").trim() ||
      null,
    official_website:
      String(formData.get("official_website") || "").trim() ||
      null,
    status:
      String(formData.get("status") || "published").trim() ||
      "published",
    is_published:
      formData.get("is_published") === "on",
  };

  const { data, error } = await supabase
    .from("results")
    .insert(payload)
    .select("id,title,slug")
    .single();

  if (error) {
    redirect(
      `/admin/results/new?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "create",
    entity_type: "result",
    entity_id: data.id,
    description: `Created result: ${data.title}`,
    metadata: {
      slug: data.slug,
      is_published: payload.is_published,
      status: payload.status,
    },
  });

  redirect(`/admin/results/${data.id}?created=1`);
}

export default async function NewResultPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/results/new");
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
            Add Result
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add a complete examination result with official result and
            website links.
          </p>
        </div>

        <Link
          href="/admin/results"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Back to Results
        </Link>
      </div>

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {params.error}
        </div>
      )}

      <form
        action={createResult}
        className="mt-7 space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Result Information"
            title="Basic Details"
            description="Enter the main result and examination information."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Result Title"
              name="title"
              required
              placeholder="e.g. SSC CGL 2026 Final Result"
            />

            <Field
              label="Slug"
              name="slug"
              placeholder="ssc-cgl-2026-final-result"
            />

            <Field
              label="Organization"
              name="organization"
              placeholder="Staff Selection Commission"
            />

            <Field
              label="Exam Name"
              name="exam_name"
              placeholder="SSC CGL 2026"
            />

            <SelectField
              label="Category"
              name="category_id"
              options={(categories || []) as Category[]}
            />

            <Field
              label="Qualification"
              name="qualification"
              placeholder="Graduation / 12th Pass / etc."
            />

            <Field
              label="Result Date"
              name="result_date"
              type="date"
            />

            <Field
              label="Expiry Date"
              name="expiry_date"
              type="date"
            />

            <SelectSimple
              label="Status"
              name="status"
              options={[
                ["published", "Published"],
                ["draft", "Draft"],
                ["archived", "Archived"],
              ]}
              defaultValue="published"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Content"
            title="Result Description"
            description="Provide useful information about the result."
          />

          <div className="mt-6">
            <TextArea
              label="Description"
              name="description"
              rows={9}
              placeholder="Write detailed information about the result, important dates, instructions and useful details..."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Official Links"
            title="Result Links"
            description="Use the official result page and official organization website."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Result URL"
              name="result_url"
              type="url"
              placeholder="https://official-site.gov.in/result"
            />

            <Field
              label="Official Website"
              name="official_website"
              type="url"
              placeholder="https://official-site.gov.in"
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Publishing"
            title="Visibility"
            description="Choose whether this result should be visible on the public website."
          />

          <label className="mt-6 flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
            />

            <span>
              <span className="block text-sm font-extrabold text-slate-800">
                Publish Result
              </span>

              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Make this result visible on the public CareerPortal website.
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/results"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-7 text-sm font-extrabold text-white hover:bg-blue-700"
          >
            Create Result
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

        {options.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SelectSimple({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: [string, string][];
  defaultValue: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
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