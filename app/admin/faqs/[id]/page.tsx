"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

type FaqRecord = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sort_order: number;
  is_published: boolean;
};

export default function EditFaqPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const id = params.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    question: "",
    answer: "",
    category: "",
    sort_order: "0",
    is_published: true,
  });

  useEffect(() => {
    async function loadFaq() {
      setLoading(true);
      setError("");

      const { data, error: fetchError } =
        await supabase
          .from("faqs")
          .select(
            "id,question,answer,category,sort_order,is_published"
          )
          .eq("id", id)
          .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setError("FAQ record was not found.");
        setLoading(false);
        return;
      }

      const faq = data as FaqRecord;

      setForm({
        question: faq.question || "",
        answer: faq.answer || "",
        category: faq.category || "",
        sort_order: String(faq.sort_order ?? 0),
        is_published: Boolean(faq.is_published),
      });

      setLoading(false);
    }

    loadFaq();
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

    if (!form.question.trim()) {
      setError("Question is required.");
      return;
    }

    if (!form.answer.trim()) {
      setError("Answer is required.");
      return;
    }

    setSaving(true);

    try {
      const sortOrder = Number(form.sort_order);

      if (!Number.isFinite(sortOrder)) {
        throw new Error("Sort order must be a valid number.");
      }

      const { data: updated, error: updateError } =
        await supabase
          .from("faqs")
          .update({
            question: form.question.trim(),
            answer: form.answer.trim(),
            category: form.category.trim() || null,
            sort_order: sortOrder,
            is_published: form.is_published,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .select("id,question")
          .single();

      if (updateError || !updated) {
        throw new Error(
          updateError?.message ||
            "FAQ could not be updated."
        );
      }

      await supabase.from("activity_logs").insert({
        actor_email: null,
        action: "faq_updated",
        entity_type: "faq",
        entity_id: updated.id,
        description: `Updated FAQ: ${updated.question}`,
        metadata: {
          category: form.category.trim() || null,
          is_published: form.is_published,
          sort_order: sortOrder,
        },
      });

      router.push("/admin/faqs");
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
      "Are you sure you want to permanently delete this FAQ?"
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");

    try {
      const { data: existing } = await supabase
        .from("faqs")
        .select("id,question")
        .eq("id", id)
        .maybeSingle();

      if (!existing) {
        throw new Error("FAQ record was not found.");
      }

      const { error: deleteError } =
        await supabase
          .from("faqs")
          .delete()
          .eq("id", id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await supabase.from("activity_logs").insert({
        actor_email: null,
        action: "faq_deleted",
        entity_type: "faq",
        entity_id: id,
        description: `Deleted FAQ: ${existing.question}`,
        metadata: null,
      });

      router.push("/admin/faqs");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "FAQ could not be deleted."
      );
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm font-bold text-slate-600">
            Loading FAQ...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            FAQs
          </p>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Edit FAQ
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update the question, answer, category and publication status.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting || saving}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete FAQ"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              FAQ Content
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Keep the answer complete, accurate and useful.
            </p>
          </div>

          <div className="space-y-5">
            <Field label="Question" required>
              <input
                value={form.question}
                onChange={(e) =>
                  updateField(
                    "question",
                    e.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Answer" required>
              <textarea
                value={form.answer}
                onChange={(e) =>
                  updateField(
                    "answer",
                    e.target.value
                  )
                }
                rows={12}
                className={textareaClass}
              />
            </Field>
          </div>
        </section>

        {/* Organization */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Organization
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Manage category and display order.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category">
              <input
                value={form.category}
                onChange={(e) =>
                  updateField(
                    "category",
                    e.target.value
                  )
                }
                placeholder="e.g. Jobs, Exams, Results"
                className={inputClass}
              />
            </Field>

            <Field label="Sort Order">
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  updateField(
                    "sort_order",
                    e.target.value
                  )
                }
                min="0"
                step="1"
                className={inputClass}
              />
            </Field>
          </div>
        </section>

        {/* Publishing */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Publishing
            </h2>
          </div>

          <Toggle
            title="Publish this FAQ"
            description="Make this FAQ visible on the public website."
            checked={form.is_published}
            onChange={(value) =>
              updateField(
                "is_published",
                value
              )
            }
          />
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => router.push("/admin/faqs")}
            disabled={saving || deleting}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving || deleting}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
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