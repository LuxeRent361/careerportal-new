import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Exam = {
  id: string;
  title?: string | null;
  name?: string | null;
  organization?: string | null;
  conducting_body?: string | null;
  category?: string | null;
  description?: string | null;
  content?: string | null;
  qualification?: string | null;
  eligibility?: string | null;
  exam_date?: string | null;
  last_date?: string | null;
  application_start?: string | null;
  official_website?: string | null;
  notification_url?: string | null;
  apply_url?: string | null;
  syllabus_url?: string | null;
  answer_key_url?: string | null;
  expiry_date?: string | null;
  status?: string | null;
  is_published?: boolean | null;
};

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    notFound();
  }

  const exam = data as Exam;

  const title = exam.title || exam.name || "Examination";
  const organization =
    exam.organization || exam.conducting_body || "Examination Authority";

  const description =
    exam.description ||
    exam.content ||
    "Detailed information about this examination is available below.";

  const isClosed =
    exam.expiry_date &&
    new Date(exam.expiry_date).getTime() < new Date().setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen bg-slate-50">
  

      <main>
        {/* Top Section */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href="/exam"
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 transition hover:text-blue-800"
            >
              ← Back to Exams
            </Link>

            <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  {exam.category && (
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      {exam.category}
                    </span>
                  )}

                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      isClosed
                        ? "bg-red-50 text-red-700"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {isClosed ? "Closed" : exam.status || "Active"}
                  </span>
                </div>

                <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                  {title}
                </h1>

                <p className="mt-4 text-lg font-semibold text-slate-700">
                  {organization}
                </p>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                  Find important examination information, eligibility,
                  application dates and official links for this examination.
                </p>
              </div>

              {/* Important Date Card */}
              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
                <p className="text-sm font-bold uppercase tracking-wider text-blue-700">
                  Important Date
                </p>

                <h2 className="mt-3 text-2xl font-extrabold text-slate-950">
                  {formatDate(exam.exam_date)}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Examination date
                </p>

                {exam.last_date && (
                  <div className="mt-5 border-t border-blue-100 pt-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Application Last Date
                    </p>

                    <p className="mt-1 font-bold text-slate-900">
                      {formatDate(exam.last_date)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              {/* Main */}
              <div className="space-y-8">
                {/* Overview */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <SectionHeading title="Examination Overview" />

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Info
                      label="Examination"
                      value={title}
                    />

                    <Info
                      label="Conducting Authority"
                      value={organization}
                    />

                    <Info
                      label="Category"
                      value={exam.category}
                    />

                    <Info
                      label="Qualification"
                      value={exam.qualification}
                    />

                    <Info
                      label="Application Start"
                      value={formatDate(exam.application_start)}
                    />

                    <Info
                      label="Application Last Date"
                      value={formatDate(exam.last_date)}
                    />

                    <Info
                      label="Examination Date"
                      value={formatDate(exam.exam_date)}
                    />

                    <Info
                      label="Status"
                      value={exam.status || (isClosed ? "Closed" : "Active")}
                    />
                  </div>
                </section>

                {/* Description */}
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <SectionHeading title="About This Examination" />

                  <div className="mt-6 whitespace-pre-line text-[15px] leading-8 text-slate-600">
                    {description}
                  </div>
                </section>

                {/* Eligibility */}
                {exam.eligibility && (
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <SectionHeading title="Eligibility" />

                    <div className="mt-6 whitespace-pre-line text-[15px] leading-8 text-slate-600">
                      {exam.eligibility}
                    </div>
                  </section>
                )}

                {/* Qualification */}
                {exam.qualification && !exam.eligibility && (
                  <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <SectionHeading title="Educational Qualification" />

                    <p className="mt-6 whitespace-pre-line leading-8 text-slate-600">
                      {exam.qualification}
                    </p>
                  </section>
                )}

                {/* Important Notice */}
                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="h-5 w-5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 9v3.75m0 3.75h.008v.008H12V16.5Zm9-4.5a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </div>

                    <div>
                      <h2 className="font-bold text-slate-950">
                        Important Verification Notice
                      </h2>

                      <p className="mt-2 text-sm leading-7 text-slate-700">
                        Examination dates, eligibility, application
                        requirements and other details can change. Always
                        verify the latest information from the official
                        notification or official website before taking any
                        action.
                      </p>
                    </div>
                  </div>
                </section>
              </div>

              {/* Sidebar */}
              <aside className="space-y-6">
                {/* Official Links */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">
                    Official Links
                  </h2>

                  <div className="mt-5 space-y-3">
                    {exam.apply_url && (
                      <ExternalLink
                        href={exam.apply_url}
                        primary
                        label="Apply / Official Portal"
                      />
                    )}

                    {exam.notification_url && (
                      <ExternalLink
                        href={exam.notification_url}
                        label="Official Notification"
                      />
                    )}

                    {exam.syllabus_url && (
                      <ExternalLink
                        href={exam.syllabus_url}
                        label="Syllabus"
                      />
                    )}

                    {exam.answer_key_url && (
                      <ExternalLink
                        href={exam.answer_key_url}
                        label="Answer Key"
                      />
                    )}

                    {exam.official_website && (
                      <ExternalLink
                        href={exam.official_website}
                        label="Official Website"
                      />
                    )}

                    {!exam.apply_url &&
                      !exam.notification_url &&
                      !exam.syllabus_url &&
                      !exam.answer_key_url &&
                      !exam.official_website && (
                        <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                          Official links are not available for this
                          examination at the moment.
                        </p>
                      )}
                  </div>
                </div>

                {/* Quick Details */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">
                    Quick Details
                  </h2>

                  <div className="mt-5 space-y-4">
                    <SidebarInfo
                      label="Organization"
                      value={organization}
                    />

                    <SidebarInfo
                      label="Category"
                      value={exam.category}
                    />

                    <SidebarInfo
                      label="Exam Date"
                      value={formatDate(exam.exam_date)}
                    />

                    <SidebarInfo
                      label="Last Date"
                      value={formatDate(exam.last_date)}
                    />
                  </div>
                </div>

                {/* Browse More */}
                <div className="rounded-3xl bg-blue-600 p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-white">
                    Explore More Exams
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-blue-100">
                    Check other examination updates available on CareerPortal.
                  </p>

                  <Link
                    href="/exam"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                  >
                    View All Exams
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-100 pb-4">
      <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
        {title}
      </h2>
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">
        {value || "Not specified"}
      </p>
    </div>
  );
}

function SidebarInfo({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value || "Not specified"}
      </p>
    </div>
  );
}

function ExternalLink({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "border border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {label}
      <span className="ml-2">↗</span>
    </a>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}