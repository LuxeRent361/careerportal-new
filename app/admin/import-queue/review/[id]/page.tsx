
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
};

type Data = Record<string, any>;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase environment variables are missing.");
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function str(value: any, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function object(value: any): Data {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return {};
}

function label(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function date(value: string) {
  if (!value) return "Not available";
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(d);
}

async function adminCheck() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin/import-queue");
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/profile");
  return user;
}

async function saveDetails(formData: FormData) {
  "use server";
  await adminCheck();

  const id = str(formData.get("id")).trim();
  if (!id) redirect("/admin/import-queue");

  const supabase = db();
  const { data: existing, error: readError } = await supabase
    .from("content_import_queue")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (readError || !existing) {
    redirect(`/admin/import-queue?error=${encodeURIComponent(readError?.message || "Record not found")}`);
  }

  const oldData = object(existing.content_data);
  const oldNormalized = object(existing.normalized_content);

  const fields = [
    "title", "content_type", "category", "organization", "post_name",
    "total_vacancies", "qualification", "age_limit", "age_relaxation",
    "salary", "application_fee", "application_start", "last_date",
    "exam_date", "result_date", "admit_card_date", "publication_date",
    "expiry_date", "selection_process", "exam_pattern", "syllabus",
    "description", "how_to_apply", "required_documents", "official_website",
    "notification_url", "apply_url", "result_url", "admit_card_url",
    "answer_key_url", "state", "job_location", "job_type", "important_dates",
    "instructions", "faqs"
  ];

  const details: Data = { ...oldData };
  for (const field of fields) {
    details[field] = str(formData.get(field)).trim();
  }

  details.updated_manually_at = new Date().toISOString();

  const normalized = {
    ...oldNormalized,
    ...details,
  };

  const update: Data = {
    title: details.title || str(existing.title, "Untitled item"),
    content_type: details.content_type || str(existing.content_type, "notification"),
    content_data: details,
    normalized_content: normalized,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("content_import_queue")
    .update(update)
    .eq("id", id);

  if (error) {
    redirect(`/admin/import-queue/review/${encodeURIComponent(id)}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/import-queue/review/${encodeURIComponent(id)}?saved=details`);
}

async function changeStatus(formData: FormData) {
  "use server";
  await adminCheck();

  const id = str(formData.get("id")).trim();
  const status = str(formData.get("status")).trim();

  if (!id || !["approved", "rejected"].includes(status)) {
    redirect("/admin/import-queue");
  }

  const supabase = db();
  const { error } = await supabase
    .from("content_import_queue")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/admin/import-queue/review/${encodeURIComponent(id)}?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/admin/import-queue/review/${encodeURIComponent(id)}?saved=${status}`);
}

async function deleteItem(formData: FormData) {
  "use server";
  await adminCheck();

  const id = str(formData.get("id")).trim();
  if (!id) redirect("/admin/import-queue");

  const supabase = db();
  const { error } = await supabase
    .from("content_import_queue")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(`/admin/import-queue/review/${encodeURIComponent(id)}?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/admin/import-queue");
}

const groups = [
  {
    title: "Basic Information",
    fields: [
      ["title", "Notification / Post Title", "text"],
      ["content_type", "Content Type", "select"],
      ["category", "Category", "text"],
      ["organization", "Department / Organization", "text"],
      ["post_name", "Post Name", "text"],
      ["state", "State / All India", "text"],
      ["job_location", "Job Location", "text"],
      ["job_type", "Job Type", "text"],
    ],
  },
  {
    title: "Vacancy & Eligibility",
    fields: [
      ["total_vacancies", "Total Vacancies", "text"],
      ["qualification", "Educational Qualification", "textarea"],
      ["age_limit", "Age Limit", "text"],
      ["age_relaxation", "Age Relaxation", "textarea"],
      ["salary", "Salary / Pay Scale", "text"],
      ["application_fee", "Application Fee", "textarea"],
    ],
  },
  {
    title: "Important Dates",
    fields: [
      ["publication_date", "Notification Date", "text"],
      ["application_start", "Application Start Date", "text"],
      ["last_date", "Last Date to Apply", "text"],
      ["exam_date", "Exam Date", "text"],
      ["admit_card_date", "Admit Card Date", "text"],
      ["result_date", "Result Date", "text"],
      ["expiry_date", "Expiry / Last Date", "text"],
      ["important_dates", "Other Important Dates", "textarea"],
    ],
  },
  {
    title: "Exam & Application Details",
    fields: [
      ["selection_process", "Selection Process", "textarea"],
      ["exam_pattern", "Exam Pattern", "textarea"],
      ["syllabus", "Syllabus", "textarea"],
      ["how_to_apply", "How to Apply", "textarea"],
      ["required_documents", "Required Documents", "textarea"],
      ["instructions", "Important Instructions", "textarea"],
      ["description", "Full Description", "textarea"],
      ["faqs", "Frequently Asked Questions", "textarea"],
    ],
  },
  {
    title: "Official Links",
    fields: [
      ["official_website", "Official Website URL", "url"],
      ["notification_url", "Notification / PDF URL", "url"],
      ["apply_url", "Apply Online URL", "url"],
      ["result_url", "Result URL", "url"],
      ["admit_card_url", "Admit Card URL", "url"],
      ["answer_key_url", "Answer Key URL", "url"],
    ],
  },
] as const;

function Field({
  name, title, type, value,
}: {
  name: string;
  title: string;
  type: string;
  value: string;
}) {
  const common = {
    id: name,
    name,
    defaultValue: value,
    className:
      "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100",
  };

  return (
    <div className="min-w-0">
      <label htmlFor={name} className="text-sm font-bold text-slate-800">
        {title}
      </label>

      {type === "textarea" ? (
        <textarea {...common} rows={4} />
      ) : type === "select" ? (
        <select {...common} defaultValue={value || "notification"}>
          {["job", "exam", "result", "admit_card", "answer_key", "syllabus", "notification", "education"].map(option => (
            <option key={option} value={option}>{label(option)}</option>
          ))}
        </select>
      ) : (
        <input {...common} type={type === "url" ? "url" : "text"} />
      )}
    </div>
  );
}

export default async function ImportQueueReviewPage({ params, searchParams }: Props) {
  await adminCheck();

  const { id } = await params;
  const query = await searchParams;
  const supabase = db();

  const { data: item, error } = await supabase
    .from("content_import_queue")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-xl font-bold">Unable to load record</h1>
        <p className="mt-2 break-words text-red-700">{error.message}</p>
        <Link href="/admin/import-queue" className="mt-5 inline-block underline">Back to queue</Link>
      </main>
    );
  }

  if (!item) notFound();

  const content = object(item.content_data);
  const normalized = object(item.normalized_content);
  const payload = object(item.payload);
  const metadata = object(item.metadata);
  const raw = object(item.raw_content);

  const values: Data = {
    ...metadata,
    ...payload,
    ...normalized,
    ...content,
  };

  values.title ||= str(item.title);
  values.content_type ||= str(item.content_type || item.item_type, "notification");
  values.category ||= str(item.category, "General");
  values.organization ||= str(item.source_name);
  values.official_website ||= str(item.source_url);
  values.notification_url ||= str(item.notification_url || item.document_url);
  values.description ||= str(item.description || item.summary);

  const status = str(item.status, "pending").toLowerCase();

  return (
    <main className="mx-auto w-full max-w-[1450px] space-y-6 p-4 sm:p-8">
      <Link href="/admin/import-queue" className="inline-flex rounded-lg border px-4 py-2 text-sm font-bold hover:bg-slate-50">
        ← Back to Import Queue
      </Link>

      <header className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-800">CareerPortal · Import Review</p>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase text-amber-900">
            {label(status)}
          </span>
        </div>
        <h1 className="mt-4 break-words text-2xl font-black text-slate-950 sm:text-3xl">
          {str(item.title, "Untitled record")}
        </h1>
        <p className="mt-3 text-sm text-slate-600">
          Source: {str(item.source_name || item.source_code, "Unknown source")} · Imported: {date(str(item.created_at || item.imported_at))}
        </p>
      </header>

      {query.saved && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-900">
          {query.saved === "details" ? "Details saved successfully." : `Record ${query.saved} successfully.`}
        </div>
      )}

      {query.error && (
        <div className="break-words rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">
          Save error: {query.error}
        </div>
      )}

      <form action={saveDetails} className="space-y-6">
        <input type="hidden" name="id" value={id} />

        <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">
          <h2 className="text-xl font-black text-slate-950">Complete Content Details</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            उपलब्ध जानकारी जाँचें और खाली फ़ील्ड भरें। सही जानकारी और आधिकारिक तारीखों की पुष्टि करके ही सेव करें।
          </p>

          <div className="mt-6 space-y-8">
            {groups.map(group => (
              <section key={group.title}>
                <h3 className="border-b pb-3 text-base font-extrabold text-emerald-900">{group.title}</h3>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  {group.fields.map(([name, title, type]) => (
                    <Field
                      key={name}
                      name={name}
                      title={title}
                      type={type}
                      value={str(values[name])}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <button type="submit" className="mt-8 w-full rounded-xl bg-emerald-800 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-emerald-900 sm:w-auto">
            Save Content Details
          </button>
        </div>
      </form>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Source Information</h2>
          <p className="mt-2 break-all text-sm text-slate-600">
            Source URL: {str(item.source_url, "Not available")}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            External Reference: {str(item.source_id, "Not available")}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Imported: {date(str(item.created_at || item.imported_at))}
          </p>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Review Actions</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            पहले विवरण सेव करें। Approve करने से पहले आधिकारिक लिंक और जानकारी की जाँच करें।
          </p>

          <div className="mt-5 grid gap-3">
            {status === "pending" || status === "duplicate" ? (
              <form action={changeStatus}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="status" value="approved" />
                <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-extrabold text-white hover:bg-emerald-800">
                  Approve Record
                </button>
              </form>
            ) : null}

            {status !== "rejected" && status !== "published" ? (
              <form action={changeStatus}>
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="status" value="rejected" />
                <button className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 font-extrabold text-red-800 hover:bg-red-100">
                  Reject Record
                </button>
              </form>
            ) : null}

            <form action={deleteItem}>
              <input type="hidden" name="id" value={id} />
              <button className="w-full rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">
                Delete Queue Item
              </button>
            </form>

            <Link href="/admin/import-queue" className="rounded-xl border px-4 py-3 text-center text-sm font-bold hover:bg-slate-50">
              Back to Import Queue
            </Link>
          </div>
        </section>
      </div>

      <details className="rounded-2xl border bg-white p-5">
        <summary className="cursor-pointer font-extrabold">Original Source Data (Debug)</summary>
        <pre className="mt-4 max-h-[500px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">
          {JSON.stringify({
            raw_content: raw,
            content_data: content,
            normalized_content: normalized,
            payload,
            metadata,
          }, null, 2)}
        </pre>
      </details>
    </main>
  );
}