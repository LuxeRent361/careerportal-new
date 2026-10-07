"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type Category = {
  id: string;
  name: string;
};

type ExamRecord = {
  id: string;
  title: string;
  slug: string | null;
  organization: string | null;
  category_id: string | null;
  exam_type: string | null;
  description: string | null;
  eligibility: string | null;
  syllabus: string | null;
  selection_process: string | null;
  application_start: string | null;
  last_date: string | null;
  exam_date: string | null;
  result_date: string | null;
  expiry_date: string | null;
  official_website: string | null;
  notification_url: string | null;
  apply_url: string | null;
  is_featured: boolean;
  is_published: boolean;
};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function EditExamPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const id = params.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    async function loadData() {
      setLoading(true);
      setError("");

      const [
        { data: exam, error: examError },
        { data: categoryData },
      ] = await Promise.all([
        supabase
          .from("exams")
          .select(
            `
              id,
              title,
              slug,
              organization,
              category_id,
              exam_type,
              description,
              eligibility,
              syllabus,
              selection_process,
              application_start,
              last_date,
              exam_date,
              result_date,
              expiry_date,
              official_website,
              notification_url,
              apply_url,
              is_featured,
              is_published
            `
          )
          .eq("id", id)
          .maybeSingle(),

        supabase
          .from("categories")
          .select("id,name")
          .eq("is_active", true)
          .order("sort_order", {
            ascending: true,
          })
          .order("name", {
            ascending: true,
          }),
      ]);

      if (examError) {
        setError(examError.message);
        setLoading(false);
        return;
      }

      if (!exam) {
        setError("Exam record was not found.");
        setLoading(false);
        return;
      }

      setCategories(categoryData || []);

      const record = exam as ExamRecord;

      setForm({
        title: record.title || "",
        slug: record.slug || "",
        organization: record.organization || "",
        category_id: record.category_id || "",
        exam_type: record.exam_type || "",
        description: record.description || "",
        eligibility: record.eligibility || "",
        syllabus: record.syllabus || "",
        selection_process:
          record.selection_process || "",
        application_start:
          record.application_start || "",
        last_date: record.last_date || "",
        exam_date: record.exam_date || "",
        result_date: record.result_date || "",
        expiry_date: record.expiry_date || "",
        official_website:
          record.official_website || "",
        notification_url:
          record.notification_url || "",
        apply_url: record.apply_url || "",
        is_featured: Boolean(record.is_featured),
        is_published: Boolean(record.is_published),
      });

      setLoading(false);
    }

    loadData();
  }, [id, supabase]);

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

      const { data: duplicate } = await supabase
        .from("exams")
        .select("id")
        .eq("slug", finalSlug)
        .neq("id", id)
        .maybeSingle();

      if (duplicate) {
        throw new Error(
          "This slug is already being used by another exam."
        );
      }

      const { data: updated, error: updateError } =
        await supabase
          .from("exams")
          .update({
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
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("id,title")
          .single();

      if (updateError || !updated) {
        throw new Error(
          updateError?.message ||
            "Exam could not be updated."
        );
      }

      await supabase.from("activity_logs").insert({
        actor_email: null,
        action: "exam_updated",
        entity_type: "exam",
        entity_id: updated.id,
        description: `Updated exam: ${updated.title}`,
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
          : "Something went wrong while updating."
      );
      setSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this exam?"
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const { data: existing } = await supabase
        .from("exams")
        .select("id,title")
        .eq("id", id)
        .maybeSingle();

      if (!existing) {
        throw new Error("Exam record was not found.");
      }

      const { error: deleteError } = await supabase
        .from("exams")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await supabase.from("activity_logs").insert({
        actor_email: null,
        action: "exam_deleted",
        entity_type: "exam",
        entity_id: id,
        description: `Deleted exam: ${existing.title}`,
        metadata: null,
      });

      router.push("/admin/exams");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Exam could not be deleted."
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-bold text-slate-600">
            Loading exam...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Exams
          </p>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Edit Exam
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update exam details, dates, links and publication status.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || saving}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete Exam"}
        </button>
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
                className={inputClass}
              />
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
              >
                <option value="">
                  Select category
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
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        {/* Details */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Eligibility & Examination Details"
            description="Keep candidate-facing information complete and accurate."
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
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        {/* Dates */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Important Dates"
            description="Manage the important examination timeline."
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
            description="Keep links pointed to official sources."
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
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {/* Publishing */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <SectionHeading
            title="Publishing"
            description="Control public visibility and featured placement."
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
            disabled={saving || deleting}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || deleting}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
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