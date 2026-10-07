import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Job = {
  id: string;
  title: string | null;
  organization: string | null;
  location: string | null;
  qualification: string | null;
  type: string | null;
  category: string | null;
  description: string | null;
  vacancies: number | null;
  age_limit: string | null;
  salary: string | null;
  application_fee: string | null;
  job_type: string | null;
  application_start: string | null;
  last_date: string | null;
  exam_date: string | null;
  official_website: string | null;
  notification_url: string | null;
  apply_url: string | null;
  expiry_date: string | null;
  is_published: boolean | null;
};

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

async function getJob(id: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();

  return data as Job | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    return {
      title: "Job Not Found | CareerPortal",
    };
  }

  return {
    title: `${job.title || "Government Job"} | CareerPortal`,
    description:
      job.description?.slice(0, 155) ||
      `Check eligibility, vacancies, dates and official links for ${job.title || "this government job"}.`,
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getJob(id);

  if (!job) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <Link
            href="/jobs"
            className="inline-flex text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            ← Back to Government Jobs
          </Link>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              {job.category || job.type || "Government Job"}
            </span>

            {job.job_type && (
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {job.job_type}
              </span>
            )}
          </div>

          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            {job.title || "Government Job"}
          </h1>

          {job.organization && (
            <p className="mt-3 text-base font-semibold text-slate-600">
              {job.organization}
            </p>
          )}

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            {job.apply_url && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-xl bg-blue-600 px-6 py-3 text-center text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
              >
                Apply Online ↗
              </a>
            )}

            {job.notification_url && (
              <a
                href={job.notification_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                View Notification ↗
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-extrabold text-slate-900">
                Job Overview
              </h2>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Detail label="Organization" value={job.organization} />
                <Detail label="Location" value={job.location} />
                <Detail label="Qualification" value={job.qualification} />
                <Detail
                  label="Vacancies"
                  value={
                    job.vacancies !== null
                      ? String(job.vacancies)
                      : null
                  }
                />
                <Detail label="Age Limit" value={job.age_limit} />
                <Detail label="Salary" value={job.salary} />
                <Detail label="Application Fee" value={job.application_fee} />
                <Detail label="Job Type" value={job.job_type} />
              </div>
            </section>

            {job.description && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="text-xl font-extrabold text-slate-900">
                  Job Description
                </h2>

                <div className="mt-5 whitespace-pre-line text-sm leading-7 text-slate-600">
                  {job.description}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-xl font-extrabold text-slate-900">
                Important Dates
              </h2>

              <div className="mt-5 space-y-3">
                <DateRow
                  label="Application Start"
                  value={formatDate(job.application_start)}
                />

                <DateRow
                  label="Last Date to Apply"
                  value={formatDate(job.last_date)}
                />

                <DateRow
                  label="Exam Date"
                  value={formatDate(job.exam_date)}
                />
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-extrabold text-slate-900">
                Important Links
              </h2>

              <div className="mt-4 space-y-3">
                {job.apply_url && (
                  <a
                    href={job.apply_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
                  >
                    Apply Online ↗
                  </a>
                )}

                {job.notification_url && (
                  <a
                    href={job.notification_url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                  >
                    Official Notification ↗
                  </a>
                )}

                {job.official_website && (
                  <a
                    href={job.official_website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                  >
                    Official Website ↗
                  </a>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
              <h2 className="font-extrabold text-slate-900">
                Important Notice
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                Always verify eligibility, dates, fees and other details
                from the official recruitment notification before applying.
              </p>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-700">
        {value || "Not specified"}
      </p>
    </div>
  );
}

function DateRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-600">
        {label}
      </span>

      <span className="text-right text-sm font-bold text-slate-900">
        {value}
      </span>
    </div>
  );
}