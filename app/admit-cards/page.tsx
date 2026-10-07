import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Latest Admit Cards | CareerPortal",
  description:
    "Find latest government exam admit cards, hall tickets and official download links.",
};

type AdmitCard = {
  id: string;
  title?: string | null;
  organization?: string | null;
  category?: string | null;
  description?: string | null;
  exam_date?: string | null;
  release_date?: string | null;
  admit_card_date?: string | null;
  download_url?: string | null;
  official_website?: string | null;
  expiry_date?: string | null;
  is_published?: boolean | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdmitCardsPage() {
  const supabase = await createClient();
  const today = new Date().toISOString();

  const { data, error } = await supabase
    .from("admit_cards")
    .select("*")
    .eq("is_published", true)
    .or(`expiry_date.is.null,expiry_date.gte.${today}`)
    .order("release_date", { ascending: false });

  const cards = (data ?? []) as AdmitCard[];

  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
            Hall Tickets
          </span>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Latest Admit Cards
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Find the latest government exam admit cards and hall tickets
            with official download links.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <h2 className="font-bold text-red-800">
              Unable to load admit cards
            </h2>
            <p className="mt-2 text-sm text-red-700">
              Please try again later.
            </p>
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🎫
            </div>

            <h2 className="mt-5 text-xl font-extrabold text-slate-900">
              No admit cards available
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              New admit card updates will appear here when published.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"
            >
              Back to Home
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {cards.map((card) => (
              <article
                key={card.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-lg sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                    {card.category || "Admit Card"}
                  </span>

                  {card.release_date && (
                    <span className="text-right text-xs font-semibold text-slate-500">
                      Released
                      <strong className="mt-0.5 block text-slate-800">
                        {formatDate(card.release_date)}
                      </strong>
                    </span>
                  )}
                </div>

                <h2 className="mt-5 text-xl font-extrabold leading-snug text-slate-900">
                  {card.title || "Government Exam Admit Card"}
                </h2>

                {card.organization && (
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    {card.organization}
                  </p>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InfoItem
                    label="Release Date"
                    value={formatDate(
                      card.release_date || card.admit_card_date
                    )}
                  />

                  <InfoItem
                    label="Exam Date"
                    value={formatDate(card.exam_date)}
                  />

                  <InfoItem
                    label="Category"
                    value={card.category || "Admit Card"}
                  />
                </div>

                {card.description && (
                  <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-500">
                    {card.description}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  {card.download_url && (
                    <a
                      href={card.download_url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700"
                    >
                      Download Admit Card ↗
                    </a>
                  )}

                  {card.official_website && (
                    <a
                      href={card.official_website}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Official Site ↗
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
      <p className="mt-1 text-sm font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}