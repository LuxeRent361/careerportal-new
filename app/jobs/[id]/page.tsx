
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  title: string | null;
  slug: string | null;
  organization: string | null;
  department: string | null;
  location: string | null;
  qualification: string | null;
  category_id: string | null;
  description: string | null;
  eligibility: string | null;
  vacancies: string | number | null;
  age_limit: string | null;
  salary: string | null;
  application_fee: string | null;
  job_type: string | null;
  employment_type: string | null;
  application_start: string | null;
  last_date: string | null;
  exam_date: string | null;
  expiry_date: string | null;
  official_website: string | null;
  notification_url: string | null;
  apply_url: string | null;
  selection_process: string | null;
  important_dates: string | null;
  how_to_apply: string | null;
  documents_required: string | null;
  is_published: boolean | null;
  category_name?: string | null;
};

function clean(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  return "";
}

function formatDate(value: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function safeUrl(value: string | null): string {
  const input = clean(value);
  if (!input) return "";

  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

async function getJob(id: string): Promise<Job | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  if (error || !data) return null;

  const job = data as Job;

  if (job.category_id) {
    const { data: category } = await supabase
      .from("categories")
      .select("name")
      .eq("id", job.category_id)
      .maybeSingle();

    job.category_name = clean(category?.name) || null;
  }

  return job;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    return { title: "Job Not Found | CareerPortal" };
  }

  return {
    title: `${job.title || "Government Job"} | CareerPortal`,
    description:
      job.description?.slice(0, 155) ||
      `Check eligibility, vacancies, important dates and official links for ${job.title || "this government job"}.`,
  };
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const text = clean(value);

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
        {text || "Not specified"}
      </p>
    </div>
  );
}

function InfoSection({
  title,
  content,
}: {
  title: string;
  content: string | null | undefined;
}) {
  const text = clean(content);
  if (!text) return null;

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <h2 className="text-xl font-extrabold text-slate-950">{title}</h2>
      <div className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-slate-700">
        {text}
      </div>
    </section>
  );
}

function DateRow({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="text-sm font-bold text-slate-950">
        {formatDate(value)}
      </span>
    </div>
  );
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) notFound();

  const organization = clean(job.organization) || clean(job.department);
  const location = clean(job.location);
  const qualification = clean(job.qualification) || clean(job.eligibility);
  const vacancies = clean(job.vacancies);

  const applyUrl = safeUrl(job.apply_url);
  const notificationUrl = safeUrl(job.notification_url);
  const officialWebsite = safeUrl(job.official_website);

  const hasLinks = Boolean(applyUrl || notificationUrl || officialWebsite);

  return (
    <main className="min-h-screen bg-[#f1f3f1] text-[#050807]">
      <section className="border-b border-[#b8c2bd] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <Link
            href="/jobs"
            className="inline-flex rounded-lg text-sm font-bold text-[#005c43] hover:underline"
          >
            ← Back to Government Jobs
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#c9e3da] px-3 py-1.5 text-xs font-bold text-[#003d2d]">
              {clean(job.category_name) || "Government Job"}
            </span>

            {job.job_type && (
              <span className="rounded-full bg-[#e1e6e3] px-3 py-1.5 text-xs font-semibold text-[#202925]">
                {job.job_type}
              </span>
            )}

            {job.employment_type && (
              <span className="rounded-full border border-[#b8c2bd] px-3 py-1.5 text-xs font-semibold">
                {job.employment_type}
              </span>
            )}
          </div>

          <h1 className="mt-5 break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            {job.title || "Government Job"}
          </h1>

          {organization && (
            <p className="mt-3 text-base font-semibold text-[#3d4742]">
              {organization}
            </p>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {applyUrl && (
              <a
                href={applyUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-xl bg-[#005c43] px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-[#003d2d]"
              >
                Apply Online ↗
              </a>
            )}

            {notificationUrl && (
              <a
                href={notificationUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-xl border border-[#b8c2bd] bg-white px-6 py-3 text-center text-sm font-bold text-[#202925] transition hover:bg-[#e1e6e3]"
              >
                View Notification / PDF ↗
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl border border-[#b8c2bd] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-black">Job Overview</h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Detail label="Organization" value={organization} />
                <Detail label="Location" value={location} />
                <Detail label="Qualification" value={qualification} />
                <Detail label="Vacancies" value={vacancies} />
                <Detail label="Age Limit" value={job.age_limit} />
                <Detail label="Salary / Pay Scale" value={job.salary} />
                <Detail label="Application Fee" value={job.application_fee} />
                <Detail label="Job Type" value={job.job_type || job.employment_type} />
              </div>
            </section>

            <InfoSection title="Job Description" content={job.description} />
            <InfoSection title="Eligibility Details" content={job.eligibility} />
            <InfoSection title="Selection Process" content={job.selection_process} />
            <InfoSection title="Other Important Dates" content={job.important_dates} />
            <InfoSection title="How to Apply" content={job.how_to_apply} />
            <InfoSection title="Required Documents" content={job.documents_required} />

            <section className="rounded-3xl border border-[#b8c2bd] bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-black">Important Dates</h2>
              <div className="mt-5 space-y-3">
                <DateRow label="Application Start" value={job.application_start} />
                <DateRow label="Last Date to Apply" value={job.last_date} />
                <DateRow label="Exam Date" value={job.exam_date} />
                <DateRow label="Expiry Date" value={job.expiry_date} />
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-[#b8c2bd] bg-white p-5 shadow-sm">
              <h2 className="font-extrabold">Important Links</h2>

              <div className="mt-4 space-y-3">
                {applyUrl && (
                  <a
                    href={applyUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block rounded-xl bg-[#005c43] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#003d2d]"
                  >
                    Apply Online ↗
                  </a>
                )}

                {notificationUrl && (
                  <a
                    href={notificationUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block rounded-xl border border-[#b8c2bd] px-4 py-3 text-center text-sm font-bold hover:bg-[#e1e6e3]"
                  >
                    Official Notification / PDF ↗
                  </a>
                )}

                {officialWebsite && (
                  <a
                    href={officialWebsite}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block rounded-xl border border-[#b8c2bd] px-4 py-3 text-center text-sm font-bold hover:bg-[#e1e6e3]"
                  >
                    Official Website ↗
                  </a>
                )}

                {!hasLinks && (
                  <p className="text-sm text-[#3d4742]">
                    Official links have not been added yet.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-[#b8c2bd] bg-[#e1e6e3] p-5">
              <h2 className="font-extrabold">Important Notice</h2>
              <p className="mt-3 text-sm leading-6 text-[#202925]">
                Apply karne se pehle eligibility, dates, fees aur doosri
                details ko official recruitment notification se verify karein.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}
