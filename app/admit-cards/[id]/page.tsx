import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AdmitCard = {
  id: string;
  title?: string | null;
  name?: string | null;
  organization?: string | null;
  conducting_body?: string | null;
  category?: string | null;
  description?: string | null;
  exam_date?: string | null;
  release_date?: string | null;
  admit_card_date?: string | null;
  download_url?: string | null;
  admit_card_url?: string | null;
  official_website?: string | null;
  notification_url?: string | null;
  expiry_date?: string | null;
  status?: string | null;
  is_published?: boolean | null;
};

export default async function AdmitCardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admit_cards")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    notFound();
  }

  const item = data as AdmitCard;

  const title = item.title || item.name || "Admit Card";
  const organization =
    item.organization || item.conducting_body || "Examination Authority";

  const downloadUrl = item.download_url || item.admit_card_url;

  return (
    <div className="min-h-screen bg-slate-50">
      

      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
            <Link
              href="/admit-cards"
              className="text-sm font-semibold text-blue-600 hover:text-blue-800"
            >
              ← Back to Admit Cards
            </Link>

            <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="flex flex-wrap gap-2">
                  {item.category && (
                    <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                      {item.category}
                    </span>
                  )}

                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    {item.status || "Available"}
                  </span>
                </div>

                <h1 className="mt-5 text-3xl font-extrabold text-slate-950 sm:text-4xl">
                  {title}
                </h1>

                <p className="mt-4 text-lg font-semibold text-slate-700">
                  {organization}
                </p>

                <p className="mt-3 max-w-3xl leading-7 text-slate-600">
                  Find admit card details, examination date and official
                  download information.
                </p>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-6">
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">
                  Examination Date
                </p>

                <p className="mt-3 text-2xl font-extrabold text-slate-950">
                  {formatDate(item.exam_date)}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Scheduled examination date
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
              <div className="space-y-8">
                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <SectionHeading title="Admit Card Overview" />

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Info label="Examination" value={title} />
                    <Info label="Organization" value={organization} />
                    <Info label="Category" value={item.category} />
                    <Info
                      label="Admit Card Release"
                      value={formatDate(item.admit_card_date)}
                    />
                    <Info
                      label="Release Date"
                      value={formatDate(item.release_date)}
                    />
                    <Info
                      label="Exam Date"
                      value={formatDate(item.exam_date)}
                    />
                    <Info label="Status" value={item.status || "Available"} />
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <SectionHeading title="About This Admit Card" />

                  <p className="mt-6 whitespace-pre-line leading-8 text-slate-600">
                    {item.description ||
                      "Admit card information is available through the official source linked on this page."}
                  </p>
                </section>

                <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                  <h2 className="font-bold text-slate-950">
                    Important Notice
                  </h2>

                  <p className="mt-2 text-sm leading-7 text-slate-700">
                    Before downloading or using an admit card, verify the
                    examination name, candidate details, examination centre,
                    date and instructions from the official examination
                    authority.
                  </p>
                </section>
              </div>

              <aside className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">
                    Official Links
                  </h2>

                  <div className="mt-5 space-y-3">
                    {downloadUrl && (
                      <ExternalLink
                        href={downloadUrl}
                        label="Download Admit Card"
                        primary
                      />
                    )}

                    {item.notification_url && (
                      <ExternalLink
                        href={item.notification_url}
                        label="Official Notification"
                      />
                    )}

                    {item.official_website && (
                      <ExternalLink
                        href={item.official_website}
                        label="Official Website"
                      />
                    )}

                    {!downloadUrl &&
                      !item.notification_url &&
                      !item.official_website && (
                        <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                          Official download links are not available at the
                          moment.
                        </p>
                      )}
                  </div>
                </div>

                <div className="rounded-3xl bg-blue-600 p-6">
                  <h2 className="text-xl font-bold text-white">
                    More Admit Cards
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-blue-100">
                    Browse other admit card updates available on CareerPortal.
                  </p>

                  <Link
                    href="/admit-cards"
                    className="mt-5 inline-flex w-full justify-center rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700"
                  >
                    View All Admit Cards
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

      <p className="mt-2 text-sm font-semibold text-slate-900">
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
      className={`flex w-full justify-center rounded-xl px-4 py-3 text-sm font-bold ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "border border-slate-200 text-slate-800 hover:bg-blue-50 hover:text-blue-700"
      }`}
    >
      {label} ↗
    </a>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}