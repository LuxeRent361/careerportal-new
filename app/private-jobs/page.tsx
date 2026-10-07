import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Private Jobs | CareerPortal",
  description:
    "Explore active private jobs and corporate opportunities on CareerPortal.",
};

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
  salary: string | null;
  last_date: string | null;
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
    month: "short",
    year: "numeric",
  });
}

export default async function PrivateJobsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString();

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("is_published", true)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .or(
      "type.ilike.%private%,category.ilike.%private%,job_type.ilike.%private%"
    )
    .order("last_date", { ascending: true });

  const jobs = (data ?? []) as Job[];

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
            Private Careers
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Latest Private Jobs
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Explore private-sector and corporate opportunities with
            important recruitment details in one place.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
            Unable to load private jobs right now. Please try again later.
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🏢
            </div>

            <h2 className="mt-5 text-xl font-extrabold text-slate-900">
              No private jobs available
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              New private opportunities will appear here when they are
              published.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {jobs.map((job) => (
              <article
                key={job.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-lg sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                    Private
                  </span>

                  {job.last_date && (
                    <span className="text-right text-xs font-semibold text-slate-500">
                      Apply by
                      <strong className="mt-0.5 block text-slate-800">
                        {formatDate(job.last_date)}
                      </strong>
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-xl font-extrabold leading-snug text-slate-900">
                  {job.title || "Private Job Opportunity"}
                </h2>

                {job.organization && (
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {job.organization}
                  </p>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InfoItem
                    label="Location"
                    value={job.location || "Not specified"}
                  />

                  <InfoItem
                    label="Qualification"
                    value={job.qualification || "See details"}
                  />

                  <InfoItem
                    label="Vacancies"
                    value={
                      job.vacancies !== null &&
                      job.vacancies !== undefined
                        ? String(job.vacancies)
                        : "See details"
                    }
                  />

                  <InfoItem
                    label="Salary"
                    value={job.salary || "See details"}
                  />
                </div>

                {job.description && (
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-500">
                    {job.description}
                  </p>
                )}

                <div className="mt-6 flex gap-3">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    View Details
                  </Link>

                  {job.apply_url && (
                    <a
                      href={job.apply_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Apply ↗
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}