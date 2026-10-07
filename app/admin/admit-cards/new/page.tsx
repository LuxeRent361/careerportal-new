import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

async function createAdmitCard(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/admit-cards/new");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const title = String(formData.get("title") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();

  if (!title) {
    redirect("/admin/admit-cards/new?error=title");
  }

  const slug = slugify(slugInput || title);

  const organization =
    String(formData.get("organization") || "").trim() || null;

  const categoryId =
    String(formData.get("category_id") || "").trim() || null;

  const examName =
    String(formData.get("exam_name") || "").trim() || null;

  const description =
    String(formData.get("description") || "").trim() || null;

  const examDate =
    String(formData.get("exam_date") || "").trim() || null;

  const releaseDate =
    String(formData.get("release_date") || "").trim() || null;

  const expiryDate =
    String(formData.get("expiry_date") || "").trim() || null;

  const admitCardUrl =
    String(formData.get("admit_card_url") || "").trim() || null;

  const officialWebsite =
    String(formData.get("official_website") || "").trim() || null;

  const isFeatured =
    formData.get("is_featured") === "on";

  const isPublished =
    formData.get("is_published") === "on";

  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("admit_cards")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    redirect("/admin/admit-cards/new?error=slug");
  }

  const { data, error } = await supabase
    .from("admit_cards")
    .insert({
      title,
      slug,
      organization,
      category_id: categoryId,
      exam_name: examName,
      description,
      exam_date: examDate,
      release_date: releaseDate,
      expiry_date: expiryDate,
      admit_card_url: admitCardUrl,
      official_website: officialWebsite,
      is_featured: isFeatured,
      is_published: isPublished,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(
      `/admin/admit-cards/new?error=${encodeURIComponent(
        error?.message || "create-failed"
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "create",
    entity_type: "admit_card",
    entity_id: data.id,
    description: `Created admit card: ${title}`,
    metadata: {
      slug,
      is_published: isPublished,
      is_featured: isFeatured,
    },
  });

  redirect(`/admin/admit-cards/${data.id}?created=1`);
}

export default async function NewAdmitCardPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/admit-cards/new");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;

  const supabase = createAdminClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id,name")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/admin/admit-cards"
            className="text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            ← Back to Admit Cards
          </Link>

          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Add Admit Card
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Create a complete admit card notification with official links
            and important dates.
          </p>
        </div>
      </div>

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {params.error === "title"
            ? "Title is required."
            : params.error === "slug"
              ? "This slug already exists. Please use a different slug."
              : params.error === "create-failed"
                ? "Unable to create the admit card."
                : params.error}
        </div>
      )}

      <form action={createAdmitCard} className="mt-7 space-y-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle
            title="Basic Information"
            description="Main information shown to visitors."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Title"
              name="title"
              required
              placeholder="SSC CGL 2026 Admit Card"
            />

            <Field
              label="Slug"
              name="slug"
              placeholder="ssc-cgl-2026-admit-card"
              hint="Leave empty to generate automatically."
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
              options={(categories ?? []).map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
          </div>

          <div className="mt-5">
            <TextArea
              label="Description"
              name="description"
              rows={7}
              placeholder="Write a useful and original description about the admit card..."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle
            title="Important Dates"
            description="Keep dates accurate so visitors can understand the timeline."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <DateField
              label="Release Date"
              name="release_date"
            />

            <DateField
              label="Exam Date"
              name="exam_date"
            />

            <DateField
              label="Expiry Date"
              name="expiry_date"
              hint="After this date the item can be treated as expired."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle
            title="Official Links"
            description="Use official government or organization URLs."
          />

          <div className="mt-6 grid gap-5">
            <Field
              label="Admit Card URL"
              name="admit_card_url"
              type="url"
              placeholder="https://..."
            />

            <Field
              label="Official Website"
              name="official_website"
              type="url"
              placeholder="https://..."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle
            title="Publication"
            description="Control how this admit card appears on the website."
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <CheckBox
              name="is_published"
              label="Publish this admit card"
              description="Make it available on the public website."
            />

            <CheckBox
              name="is_featured"
              label="Mark as featured"
              description="Highlight this admit card in featured sections."
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/admit-cards"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
          >
            Create Admit Card
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  hint,
}: {
  label: string;
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
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
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-blue-500 focus:bg-white"
      />

      {hint && (
        <span className="mt-1.5 block text-xs text-slate-400">
          {hint}
        </span>
      )}
    </label>
  );
}

function DateField({
  label,
  name,
  hint,
}: {
  label: string;
  name: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <input
        name={name}
        type="date"
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
      />

      {hint && (
        <span className="mt-1.5 block text-xs text-slate-400">
          {hint}
        </span>
      )}
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
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <select
        name={name}
        defaultValue=""
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none focus:border-blue-500 focus:bg-white"
      >
        <option value="">Select category</option>

        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
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
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 outline-none transition focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function CheckBox({
  name,
  label,
  description,
}: {
  name: string;
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-white">
      <input
        name={name}
        type="checkbox"
        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600"
      />

      <span>
        <span className="block text-sm font-extrabold text-slate-800">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-slate-500">
          {description}
        </span>
      </span>
    </label>
  );
}