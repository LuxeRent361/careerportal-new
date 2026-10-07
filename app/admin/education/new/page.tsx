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

export default function NewEducationPage() {
  const router = useRouter();
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    slug: "",
    category_id: "",
    education_level: "",
    description: "",
    eligibility: "",
    syllabus: "",
    career_scope: "",
    fees: "",
    duration: "",
    official_website: "",
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
      setError("Education title is required.");
      return;
    }

    setSaving(true);

    try {
      const finalSlug =
        form.slug.trim() || makeSlug(form.title);

      if (!finalSlug) {
        setError("Please enter a valid title or slug.");
        setSaving(false);
        return;
      }

      const { data: existing } = await supabase
        .from("education")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();

      if (existing) {
        setError(
          "This slug already exists. Please use a different slug."
        );
        setSaving(false);
        return;
      }

      const { data: education, error: insertError } =
        await supabase
          .from("education")
          .insert({
            title: form.title.trim(),
            slug: finalSlug,
            category_id: form.category_id || null,
            education_level:
              form.education_level.trim() || null,
            description:
              form.description.trim() || null,
            eligibility:
              form.eligibility.trim() || null,
            syllabus:
              form.syllabus.trim() || null,
            career_scope:
              form.career_scope.trim() || null,
            fees: form.fees.trim() || null,
            duration: form.duration.trim() || null,
            official_website:
              form.official_website.trim() || null,
            is_featured: form.is_featured,
            is_published: form.is_published,
          })
          .select("id,title")
          .single();

      if (insertError || !education) {
        throw new Error(
          insertError?.message ||
            "Education could not be created."
        );
      }

      await supabase.from("activity_logs").insert({
        actor_email: null,
        action: "education_created",
        entity_type: "education",
        entity_id: education.id,
        description: `Created education: ${education.title}`,
        metadata: {
          slug: finalSlug,
        },
      });

      router.push("/admin/education");
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
          Education
        </p>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Add Education
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Create a detailed education guide for students and
          visitors.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Basic Information
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Main information that appears on the education listing.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Title"
              required
              className="sm:col-span-2"
            >
              <input
                value={form.title}
                onChange={(e) =>
                  updateField("title", e.target.value)
                }
                placeholder="e.g. Bachelor of Computer Applications (BCA)"
                className={inputClass}
              />
            </Field>

            <Field label="Slug">
              <input
                value={form.slug}
                onChange={(e) =>
                  updateField("slug", makeSlug(e.target.value))
                }
                placeholder="bachelor-of-computer-applications"
                className={inputClass}
              />

              <p className="mt-1.5 text-[11px] text-slate-400">
                Leave empty to generate automatically from title.
              </p>
            </Field>

            <Field label="Education Level">
              <input
                value={form.education_level}
                onChange={(e) =>
                  updateField(
                    "education_level",
                    e.target.value
                  )
                }
                placeholder="e.g. Graduation, Diploma, 12th, Post Graduation"
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

            <Field label="Duration">
              <input
                value={form.duration}
                onChange={(e) =>
                  updateField(
                    "duration",
                    e.target.value
                  )
                }
                placeholder="e.g. 3 Years"
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
                rows={5}
                placeholder="Write a useful overview of this education/course..."
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        {/* Detailed Information */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Detailed Information
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Add useful information that makes the page valuable
              for students.
            </p>
          </div>

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
                rows={5}
                placeholder="Mention eligibility, qualification, age or other admission requirements..."
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
                rows={7}
                placeholder="Write the syllabus or major subjects/modules..."
                className={textareaClass}
              />
            </Field>

            <Field label="Career Scope">
              <textarea
                value={form.career_scope}
                onChange={(e) =>
                  updateField(
                    "career_scope",
                    e.target.value
                  )
                }
                rows={6}
                placeholder="Explain career opportunities, jobs, higher studies and scope..."
                className={textareaClass}
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Fees">
                <input
                  value={form.fees}
                  onChange={(e) =>
                    updateField(
                      "fees",
                      e.target.value
                    )
                  }
                  placeholder="e.g. ₹20,000 - ₹50,000 per year"
                  className={inputClass}
                />
              </Field>

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
            </div>
          </div>
        </section>

        {/* Publishing */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Publishing
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Control whether this education guide is visible publicly.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              title="Publish this education"
              description="Make this guide visible on the public website."
              checked={form.is_published}
              onChange={(value) =>
                updateField("is_published", value)
              }
            />

            <Toggle
              title="Featured education"
              description="Highlight this guide in featured education sections."
              checked={form.is_featured}
              onChange={(value) =>
                updateField("is_featured", value)
              }
            />
          </div>
        </section>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/admin/education")}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Education"}
          </button>
        </div>
      </form>
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
        onChange={(e) => onChange(e.target.checked)}
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