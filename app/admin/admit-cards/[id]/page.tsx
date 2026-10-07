import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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

async function updateAdmitCard(
  id: string,
  formData: FormData
) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/admin/admit-cards/${id}`);
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const title = String(formData.get("title") || "").trim();
  const slugInput = String(formData.get("slug") || "").trim();

  if (!title) {
    redirect(`/admin/admit-cards/${id}?error=title`);
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
    .neq("id", id)
    .maybeSingle();

  if (existing) {
    redirect(`/admin/admit-cards/${id}?error=slug`);
  }

  const { error } = await supabase
    .from("admit_cards")
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/admit-cards/${id}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "update",
    entity_type: "admit_card",
    entity_id: id,
    description: `Updated admit card: ${title}`,
    metadata: {
      slug,
      is_published: isPublished,
      is_featured: isFeatured,
    },
  });

  redirect(`/admin/admit-cards/${id}?saved=1`);
}

async function deleteAdmitCard(id: string) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/admin/admit-cards/${id}`);
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { data: item } = await supabase
    .from("admit_cards")
    .select("id,title")
    .eq("id", id)
    .maybeSingle();

  if (!item) {
    notFound();
  }

  const { error } = await supabase
    .from("admit_cards")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/admit-cards/${id}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "delete",
    entity_type: "admit_card",
    entity_id: id,
    description: `Deleted admit card: ${item.title}`,
    metadata: null,
  });

  redirect("/admin/admit-cards?deleted=1");
}

export default async function EditAdmitCardPage({
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
    redirect("/login?next=/admin/admit-cards");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const { id } = await params;
  const query = await searchParams;

  const supabase = createAdminClient();

  const [
    { data: item, error },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from("admit_cards")
      .select(
        `
        id,
        title,
        slug,
        organization,
        category_id,
        exam_name,
        description,
        exam_date,
        release_date,
        expiry_date,
        admit_card_url,
        official_website,
        is_featured,
        is_published,
        created_at,
        updated_at
      `
      )
      .eq("id", id)
      .maybeSingle(),

    supabase
      .from("categories")
      .select("id,name")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  if (!item) {
    notFound();
  }

  const today = new Date()
    .toISOString()
    .slice(0, 10);

  const expired =
    Boolean(item.expiry_date) &&
    item.expiry_date < today;

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
            Edit Admit Card
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Update this admit card and control its publication status.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {expired && (
            <span className="rounded-full bg-red-50 px-3 py-1.5 text-xs font-extrabold text-red-700">
              EXPIRED
            </span>
          )}

          {item.is_published ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-700">
              PUBLISHED
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">
              DRAFT
            </span>
          )}
        </div>
      </div>

      {query.saved && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Admit card updated successfully.
        </div>
      )}

      {query.created && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Admit card created successfully.
        </div>
      )}

      {query.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {query.error === "title"
            ? "Title is required."
            : query.error === "slug"
              ? "This slug already exists. Please use a different slug."
              : query.error}
        </div>
      )}

      <form
        action={updateAdmitCard.bind(null, id)}
        className="mt-7 space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle
            title="Basic Information"
            description="Main information shown to visitors."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Title"
              name="title"
              defaultValue={item.title}
              required
            />

            <Field
              label="Slug"
              name="slug"
              defaultValue={item.slug ?? ""}
              hint="Use a unique SEO-friendly slug."
            />

            <Field
              label="Organization"
              name="organization"
              defaultValue={item.organization ?? ""}
            />

            <Field
              label="Exam Name"
              name="exam_name"
              defaultValue={item.exam_name ?? ""}
            />

            <SelectField
              label="Category"
              name="category_id"
              defaultValue={item.category_id ?? ""}
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
              rows={8}
              defaultValue={item.description ?? ""}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle
            title="Important Dates"
            description="Update the official timeline carefully."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <DateField
              label="Release Date"
              name="release_date"
              defaultValue={item.release_date ?? ""}
            />

            <DateField
              label="Exam Date"
              name="exam_date"
              defaultValue={item.exam_date ?? ""}
            />

            <DateField
              label="Expiry Date"
              name="expiry_date"
              defaultValue={item.expiry_date ?? ""}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle
            title="Official Links"
            description="Use official URLs wherever possible."
          />

          <div className="mt-6 grid gap-5">
            <Field
              label="Admit Card URL"
              name="admit_card_url"
              type="url"
              defaultValue={item.admit_card_url ?? ""}
            />

            <Field
              label="Official Website"
              name="official_website"
              type="url"
              defaultValue={item.official_website ?? ""}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionTitle
            title="Publication"
            description="Control visibility and featured placement."
          />

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <CheckBox
              name="is_published"
              label="Publish this admit card"
              description="Make it available on the public website."
              checked={item.is_published}
            />

            <CheckBox
              name="is_featured"
              label="Mark as featured"
              description="Highlight this admit card in featured sections."
              checked={item.is_featured}
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            formAction={deleteAdmitCard.bind(null, id)}
            type="submit"
            className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100"
          >
            Delete Admit Card
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
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
              Save Changes
            </button>
          </div>
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
  defaultValue,
  placeholder,
  type = "text",
  required = false,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
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
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <input
        name={name}
        type="date"
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
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
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <select
        name={name}
        defaultValue={defaultValue}
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
  defaultValue,
}: {
  label: string;
  name: string;
  rows: number;
  defaultValue?: string;
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
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 outline-none transition focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function CheckBox({
  name,
  label,
  description,
  checked,
}: {
  name: string;
  label: string;
  description: string;
  checked: boolean;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 hover:bg-white">
      <input
        name={name}
        type="checkbox"
        defaultChecked={checked}
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