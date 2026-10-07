import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Latest Exams | CareerPortal",
  description:
    "Find upcoming government exams, recruitment exams, application dates, eligibility and official notification links.",
};

type Exam = {
  id: string;
  title: string | null;
  organization: string | null;
  category: string | null;
  description: string | null;
  exam_date: string | null;
  application_start: string | null;
  last_date: string | null;
  official_website: string | null;
  notification_url: string | null;
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

export default async function ExamPage() {
  const supabase = await createClient();
  const today = new Date().toISOString();

  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("is_published", true)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .order("exam_date", { ascending: true });

  const exams = (data ?? []) as Exam[];

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
            Examination Updates
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Latest Government Exams
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Stay updated with important government examinations, application
            dates, exam dates, eligibility information and official notices.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-800">
              Unable to load exams
            </h2>
            <p className="mt-2 text-sm text-red-700">
              Please try again later.
            </p>
          </div>
        ) : exams.length === 0 ? (
          <EmptyState
            icon="📝"
            title="No exams available"
            description="New examination updates will appear here when they are published."
          />
        ) : (
          <>
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                Examination Calendar
              </p>

              <h2 className="mt-1 text-2xl font-extrabold text-slate-900">
                Upcoming & Active Exams
              </h2>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {exams.map((exam) => (
                <article
                  key={exam.id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      {exam.category || "Government Exam"}
                    </span>

                    {exam.exam_date && (
                      <div className="text-right">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          Exam Date
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-slate-800">
                          {formatDate(exam.exam_date)}
                        </p>
                      </div>
                    )}
                  </div>

                  <h2 className="mt-5 text-xl font-extrabold leading-snug text-slate-900">
                    {exam.title || "Government Examination"}
                  </h2>

                  {exam.organization && (
                    <p className="mt-2 text-sm font-semibold text-slate-600">
                      {exam.organization}
                    </p>
                  )}

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <InfoItem
                      label="Application Start"
                      value={formatDate(exam.application_start)}
                    />

                    <InfoItem
                      label="Last Date"
                      value={formatDate(exam.last_date)}
                    />

                    <InfoItem
                      label="Exam Date"
                      value={formatDate(exam.exam_date)}
                    />

                    <InfoItem
                      label="Category"
                      value={exam.category || "Government Exam"}
                    />
                  </div>

                  {exam.description && (
                    <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-500">
                      {exam.description}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    {exam.notification_url && (
                      <a
                        href={exam.notification_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        Notification ↗
                      </a>
                    )}

                    {exam.official_website && (
                      <a
                        href={exam.official_website}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-blue-700"
                      >
                        Official Website ↗
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </>
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
      <p className="mt-1 text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
        {icon}
      </div>

      <h2 className="mt-5 text-xl font-extrabold text-slate-900">
        {title}
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      <Link
        href="/"
        className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
      >
        Back to Home
      </Link>
    </div>
  );
}