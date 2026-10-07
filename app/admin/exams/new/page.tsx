"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewExamPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    organization: "",
    category_id: "",
    exam_type: "",
    description: "",
    eligibility: "",
    syllabus: "",
    selection_process: "",
    application_start: "",
    last_date: "",
    exam_date: "",
    result_date: "",
    expiry_date: "",
    official_website: "",
    notification_url: "",
    apply_url: "",
    is_featured: false,
    is_published: false,
  });

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("categories")
        .select("id,name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      setCategories(data || []);
      setLoadingCategories(false);
    }

    loadCategories();
  }, [supabase]);

  function updateField(
    field: keyof typeof form,
    value: string | boolean
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!form.title.trim()) {
      setError("Exam title is required.");
      return;
    }

    setSaving(true);

    try {
      const finalSlug =
        form.slug.trim() || makeSlug(form.title);

      if (!finalSlug) {
        throw new Error("Please enter a valid title or slug.");
      }

      const { data: existing } = await supabase
        .from("exams")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (existing) {
        throw new Error(
          "This slug already exists. Please use a different slug."
        );
      }

      const { data: exam, error: insertError } =
        await supabase
          .from("exams")
          .insert({
            title: form.title.trim(),
            slug: finalSlug,
            organization:
              form.organization.trim() || null,
            category_id:
              form.category_id || null,
            exam_type:
              form.exam_type.trim() || null,
            description:
              form.description.trim() || null,
            eligibility:
              form.eligibility.trim() || null,
            syllabus:
              form.syllabus.trim() || null,
            selection_process:
              form.selection_process.trim() || null,
            application_start:
              form.application_start || null,
            last_date:
              form.last_date || null,
            exam_date:
              form.exam_date || null,
            result_date:
              form.result_date || null,
            expiry_date:
              form.expiry_date || null,
            official_website:
              form.official_website.trim() || null,
            notification_url:
              form.notification_url.trim() || null,
            apply_url:
              form.apply_url.trim() || null,
            is_featured: form.is_featured,
            is_published: form.is_published,
          })
          .select("id,title")
          .single();

      if (insertError || !exam) {
        throw new Error(
          insertError?.message ||
            "Exam could not be created."
        );
      }

      await supabase.from("activity_logs").insert({
        actor_email: null,
        action: "exam_created",
        entity_type: "exam",
        entity_id: exam.id,
        description: `Created exam: ${exam.title}`,
        metadata: {
          slug: finalSlug,
          is_published: form.is_published,
          is_featured: form.is_featured,
        },
      });

      router.push("/admin/exams");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving."
      );
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
          Exams
        </p>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Add Exam
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create a complete exam information page with dates,
          eligibility, syllabus and official links.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Basic Information"
            description="Main information about the examination."
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Exam Title"
              required
              className="sm:col-span-2"
            >
              <input
                value={form.title}
                onChange={(e) =>
                  updateField("title", e.target.value)
                }
                placeholder="e.g. SSC CGL 2026"
                className={inputClass}
              />
            </Field>

            <Field label="Slug">
              <input
                value={form.slug}
                onChange={(e) =>
                  updateField(
                    "slug",
                    makeSlug(e.target.value)
                  )
                }
                placeholder="ssc-cgl-2026"
                className={inputClass}
              />

              <p className="mt-1.5 text-[11px] text-slate-400">
                Leave empty to generate from the title.
              </p>
            </Field>

            <Field label="Organization">
              <input
                value={form.organization}
                onChange={(e) =>
                  updateField(
                    "organization",
                    e.target.value
                  )
                }
                placeholder="e.g. Staff Selection Commission"
                className={inputClass}
              />
            </Field>

            <Field label="Category">
              <select
                value={form.category_id}
                onChange={(e) =>
                  updateField(
                    "category_id",
                    e.target.value
                  )
                }
                className={inputClass}
                disabled={loadingCategories}
              >
                <option value="">
                  {loadingCategories
                    ? "Loading categories..."
                    : "Select category"}
                </option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Exam Type">
              <input
                value={form.exam_type}
                onChange={(e) =>
                  updateField(
                    "exam_type",
                    e.target.value
                  )
                }
                placeholder="e.g. Competitive Exam"
                className={inputClass}
              />
            </Field>

            <Field
              label="Description"
              className="sm:col-span-2"
            >
              <textarea
                value={form.description}
                onChange={(e) =>
                  updateField(
                    "description",
                    e.target.value
                  )
                }
                rows={6}
                placeholder="Write a detailed overview of this examination..."
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        {/* Eligibility & syllabus */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Eligibility & Examination Details"
            description="Provide useful information candidates need before applying."
          />

          <div className="space-y-5">
            <Field label="Eligibility">
              <textarea
                value={form.eligibility}
                onChange={(e) =>
                  updateField(
                    "eligibility",
                    e.target.value
                  )
                }
                rows={6}
                placeholder="Qualification, age limit, nationality and other eligibility requirements..."
                className={textareaClass}
              />
            </Field>

            <Field label="Syllabus">
              <textarea
                value={form.syllabus}
                onChange={(e) =>
                  updateField(
                    "syllabus",
                    e.target.value
                  )
                }
                rows={8}
                placeholder="Detailed syllabus and subjects..."
                className={textareaClass}
              />
            </Field>

            <Field label="Selection Process">
              <textarea
                value={form.selection_process}
                onChange={(e) =>
                  updateField(
                    "selection_process",
                    e.target.value
                  )
                }
                rows={6}
                placeholder="e.g. Tier 1 → Tier 2 → Document Verification..."
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        {/* Dates */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Important Dates"
            description="Enter dates exactly as published in the official notification."
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <DateField
              label="Application Start"
              value={form.application_start}
              onChange={(value) =>
                updateField(
                  "application_start",
                  value
                )
              }
            />

            <DateField
              label="Last Date"
              value={form.last_date}
              onChange={(value) =>
                updateField("last_date", value)
              }
            />

            <DateField
              label="Exam Date"
              value={form.exam_date}
              onChange={(value) =>
                updateField("exam_date", value)
              }
            />

            <DateField
              label="Result Date"
              value={form.result_date}
              onChange={(value) =>
                updateField("result_date", value)
              }
            />

            <DateField
              label="Expiry Date"
              value={form.expiry_date}
              onChange={(value) =>
                updateField(
                  "expiry_date",
                  value
                )
              }
            />
          </div>
        </section>

        {/* Links */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Official Links"
            description="Use official and trusted URLs only."
          />

          <div className="grid gap-5">
            <Field label="Official Website">
              <input
                type="url"
                value={form.official_website}
                onChange={(e) =>
                  updateField(
                    "official_website",
                    e.target.value
                  )
                }
                placeholder="https://example.com"
                className={inputClass}
              />
            </Field>

            <Field label="Notification URL">
              <input
                type="url"
                value={form.notification_url}
                onChange={(e) =>
                  updateField(
                    "notification_url",
                    e.target.value
                  )
                }
                placeholder="https://example.com/notification.pdf"
                className={inputClass}
              />
            </Field>

            <Field label="Apply URL">
              <input
                type="url"
                value={form.apply_url}
                onChange={(e) =>
                  updateField(
                    "apply_url",
                    e.target.value
                  )
                }
                placeholder="https://example.com/apply"
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {/* Publishing */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Publishing"
            description="Control how this exam appears on the public website."
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              title="Publish this exam"
              description="Make this exam visible on the public website."
              checked={form.is_published}
              onChange={(value) =>
                updateField(
                  "is_published",
                  value
                )
              }
            />

            <Toggle
              title="Featured exam"
              description="Highlight this exam in featured sections."
              checked={form.is_featured}
              onChange={(value) =>
                updateField(
                  "is_featured",
                  value
                )
              }
            />
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/admin/exams")}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Exam"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 border-b border-slate-100 pb-4">
      <h2 className="text-base font-extrabold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  required,
  className = "",
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-600">
        {label}
        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </label>

      {children}
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="date"
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className={inputClass}
      />
    </Field>
  );
}

function Toggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-blue-200 hover:bg-blue-50/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) =>
          onChange(e.target.checked)
        }
        className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
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

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50";

const textareaClass =
  "w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50";