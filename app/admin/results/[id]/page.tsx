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

type Result = {
  id: string;
  title: string;
  slug: string | null;
  organization: string | null;
  category_id: string | null;
  exam_name: string | null;
  description: string | null;
  qualification: string | null;
  result_date: string | null;
  expiry_date: string | null;
  result_url: string | null;
  official_website: string | null;
  status: string;
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

async function updateResult(formData: FormData) {
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
    redirect("/admin/results?error=Result%20ID%20is%20missing");
  }

  if (!title) {
    redirect(
      `/admin/results/${id}?error=Result%20title%20is%20required`
    );
  }

  const slugInput = String(
    formData.get("slug") || ""
  ).trim();

  const slug = makeSlug(slugInput || title);

  if (!slug) {
    redirect(
      `/admin/results/${id}?error=Valid%20slug%20is%20required`
    );
  }

  const supabase = createAdminClient();

  const { data: duplicate } = await supabase
    .from("results")
    .select("id")
    .eq("slug", slug)
    .neq("id", id)
    .maybeSingle();

  if (duplicate) {
    redirect(
      `/admin/results/${id}?error=${encodeURIComponent(
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
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("results")
    .update(payload)
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/results/${id}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "update",
    entity_type: "result",
    entity_id: id,
    description: `Updated result: ${title}`,
    metadata: {
      slug,
      status: payload.status,
      is_published: payload.is_published,
    },
  });

  redirect(`/admin/results/${id}?saved=1`);
}

async function deleteResult(formData: FormData) {
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

  if (!id) {
    redirect("/admin/results?error=Result%20ID%20is%20missing");
  }

  const supabase = createAdminClient();

  const { data: result } = await supabase
    .from("results")
    .select("id,title,slug")
    .eq("id", id)
    .maybeSingle();

  if (!result) {
    redirect("/admin/results?error=Result%20not%20found");
  }

  const { error } = await supabase
    .from("results")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/results/${id}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "delete",
    entity_type: "result",
    entity_id: id,
    description: `Deleted result: ${result.title}`,
    metadata: {
      slug: result.slug,
    },
  });

  redirect("/admin/results?deleted=1");
}

export default async function EditResultPage({
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
    { data: result, error: resultError },
    { data: categories, error: categoryError },
  ] = await Promise.all([
    supabase
      .from("results")
      .select("*")
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("categories")
      .select("id,name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  if (resultError) {
    throw new Error(resultError.message);
  }

  if (categoryError) {
    throw new Error(categoryError.message);
  }

  if (!result) {
    notFound();
  }

  const currentResult = result as Result;
  const categoryRows = (categories || []) as Category[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Edit Result
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update result information, dates, official links and visibility.
          </p>
        </div>

        <Link
          href="/admin/results"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Back to Results
        </Link>
      </div>

      {query.saved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Result updated successfully.
        </div>
      )}

      {query.created && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Result created successfully.
        </div>
      )}

      {query.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {query.error}
        </div>
      )}

      <form
        action={updateResult}
        className="mt-7 space-y-6"
      >
        <input
          type="hidden"
          name="id"
          value={currentResult.id}
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Result Information"
            title="Basic Details"
            description="Update the main result and examination information."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Result Title"
              name="title"
              required
              defaultValue={currentResult.title}
            />

            <Field
              label="Slug"
              name="slug"
              required
              defaultValue={currentResult.slug || ""}
            />

            <Field
              label="Organization"
              name="organization"
              defaultValue={
                currentResult.organization || ""
              }
            />

            <Field
              label="Exam Name"
              name="exam_name"
              defaultValue={
                currentResult.exam_name || ""
              }
            />

            <SelectField
              label="Category"
              name="category_id"
              value={currentResult.category_id || ""}
              options={categoryRows}
            />

            <Field
              label="Qualification"
              name="qualification"
              defaultValue={
                currentResult.qualification || ""
              }
            />

            <Field
              label="Result Date"
              name="result_date"
              type="date"
              defaultValue={
                currentResult.result_date || ""
              }
            />

            <Field
              label="Expiry Date"
              name="expiry_date"
              type="date"
              defaultValue={
                currentResult.expiry_date || ""
              }
            />

            <SelectSimple
              label="Status"
              name="status"
              defaultValue={
                currentResult.status || "published"
              }
              options={[
                ["published", "Published"],
                ["draft", "Draft"],
                ["archived", "Archived"],
              ]}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Content"
            title="Result Description"
            description="Keep the information useful, accurate and clear."
          />

          <div className="mt-6">
            <TextArea
              label="Description"
              name="description"
              rows={10}
              defaultValue={
                currentResult.description || ""
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Official Links"
            title="Result Links"
            description="Maintain the official result and organization links."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Result URL"
              name="result_url"
              type="url"
              defaultValue={
                currentResult.result_url || ""
              }
            />

            <Field
              label="Official Website"
              name="official_website"
              type="url"
              defaultValue={
                currentResult.official_website || ""
              }
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Publishing"
            title="Visibility"
            description="Control whether this result is publicly visible."
          />

          <label className="mt-6 flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <input
              type="checkbox"
              name="is_published"
              defaultChecked={currentResult.is_published}
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

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            formAction={deleteResult}
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-red-50 px-6 text-sm font-extrabold text-red-700 hover:bg-red-100"
          >
            Delete Result
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
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
  defaultValue,
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue: string;
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
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}