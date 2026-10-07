import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function getString(
  row: Record<string, unknown>,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = row[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
    ) {
      return String(value);
    }
  }

  return fallback;
}

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function formatDate(value: string) {
  if (!value) {
    return "Not available";
  }

  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

async function updateStatus(
  id: string,
  status: "approved" | "rejected"
) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect(
      `/login?next=/admin/import-queue/review/${encodeURIComponent(
        id
      )}`
    );
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("content_import_queue")
    .update({
      status,
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/import-queue/review/${encodeURIComponent(
        id
      )}?error=${encodeURIComponent(error.message)}`
    );
  }

  try {
    await supabase
      .from("activity_logs")
      .insert({
        actor_user_id: user.id,
        actor_email: user.email,
        action:
          status === "approved"
            ? "import_approved"
            : "import_rejected",
        entity_type: "import_queue",
        entity_id: id,
        description:
          status === "approved"
            ? "Imported content approved for publishing workflow."
            : "Imported content rejected during review.",
        metadata: {
          queue_id: id,
          status,
        },
      });
  } catch (logError) {
    console.error(
      "Activity log error:",
      logError
    );
  }

  redirect(
    `/admin/import-queue/review/${encodeURIComponent(
      id
    )}?saved=${status}`
  );
}

async function deleteItem(id: string) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/import-queue");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("content_import_queue")
    .delete()
    .eq("id", id);

  if (error) {
    redirect(
      `/admin/import-queue/review/${encodeURIComponent(
        id
      )}?error=${encodeURIComponent(error.message)}`
    );
  }

  try {
    await supabase
      .from("activity_logs")
      .insert({
        actor_user_id: user.id,
        actor_email: user.email,
        action: "import_deleted",
        entity_type: "import_queue",
        entity_id: id,
        description:
          "Imported content was deleted from the import queue.",
        metadata: {
          queue_id: id,
        },
      });
  } catch (logError) {
    console.error(
      "Activity log error:",
      logError
    );
  }

  redirect("/admin/import-queue");
}

export default async function ImportReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(
      "/login?next=/admin/import-queue"
    );
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const { id } = await params;
  const query = await searchParams;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("content_import_queue")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return (
      <div className="space-y-6">
        <BackLink />

        <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-extrabold text-red-800">
            Unable to load imported content
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {error.message}
          </p>
        </section>
      </div>
    );
  }

  if (!data) {
    notFound();
  }

  const row =
    data as Record<string, unknown>;

  const title = getString(
    row,
    ["title", "headline", "name"],
    "Untitled Content"
  );

  const source = getString(
    row,
    [
      "source",
      "source_code",
      "source_name",
    ],
    "Unknown Source"
  );

  const contentType = getString(
    row,
    [
      "content_type",
      "type",
      "content_type_code",
    ],
    "Unknown"
  );

  const category = getString(
    row,
    [
      "category",
      "category_name",
    ],
    "Uncategorized"
  );

  const status = getString(
    row,
    [
      "status",
      "import_status",
    ],
    "pending"
  );

  const description = getString(
    row,
    [
      "description",
      "content",
      "details",
      "summary",
      "body",
    ],
    "No description was provided by the source."
  );

  const officialUrl = getString(
    row,
    [
      "official_url",
      "source_url",
      "url",
      "redirect_url",
      "official_website",
    ]
  );

  const notificationUrl = getString(
    row,
    [
      "notification_url",
      "notice_url",
      "document_url",
      "pdf_url",
    ]
  );

  const createdAt = getString(
    row,
    ["created_at", "createdAt"]
  );

  const publishedAt = getString(
    row,
    [
      "published_at",
      "publishedAt",
    ]
  );

  const expiryDate = getString(
    row,
    [
      "expiry_date",
      "expiryDate",
    ]
  );

  const externalId = getString(
    row,
    [
      "external_id",
      "source_id",
      "externalId",
    ]
  );

  const rawContent = getString(
    row,
    [
      "raw_content",
      "raw_data",
      "source_data",
    ]
  );

  const canApprove =
    normalizeStatus(status) ===
      "pending" ||
    normalizeStatus(status) ===
      "duplicate";

  const isPublished =
    normalizeStatus(status) ===
    "published";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Import Queue
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Review Imported Content
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Verify the source, content, dates and official links
            before approving this item.
          </p>
        </div>

        <BackLink />
      </div>

      {/* Success */}
      {query.saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-extrabold text-emerald-800">
            {query.saved === "approved"
              ? "Content approved successfully."
              : "Content rejected successfully."}
          </p>

          <p className="mt-1 text-xs text-emerald-700">
            The import queue status has been updated.
          </p>
        </div>
      ) : null}

      {/* Error */}
      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-extrabold text-red-800">
            Action failed
          </p>

          <p className="mt-1 text-xs leading-5 text-red-700">
            {query.error}
          </p>
        </div>
      ) : null}

      {/* Main content */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Content */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={status} />

              <span className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                {source}
              </span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-600">
                {formatLabel(contentType)}
              </span>
            </div>

            <h2 className="mt-5 text-xl font-extrabold leading-8 text-slate-900 sm:text-2xl">
              {title}
            </h2>

            <div className="mt-6">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Description
              </h3>

              <div className="mt-3 rounded-2xl bg-slate-50 p-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {description}
                </p>
              </div>
            </div>
          </section>

          {/* Links */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-extrabold text-slate-900">
              Official References
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Verify every important detail against the original
              official source.
            </p>

            <div className="mt-5 space-y-3">
              {officialUrl ? (
                <a
                  href={officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">
                      Official Source
                    </p>

                    <p className="mt-1 break-all text-xs text-blue-600">
                      {officialUrl}
                    </p>
                  </div>

                  <span className="shrink-0 text-lg">
                    ↗
                  </span>
                </a>
              ) : (
                <EmptyReference
                  label="Official Source"
                />
              )}

              {notificationUrl ? (
                <a
                  href={notificationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <div>
                    <p className="text-xs font-extrabold text-slate-800">
                      Notification / Document
                    </p>

                    <p className="mt-1 break-all text-xs text-blue-600">
                      {notificationUrl}
                    </p>
                  </div>

                  <span className="shrink-0 text-lg">
                    ↗
                  </span>
                </a>
              ) : null}
            </div>
          </section>

          {/* Raw source information */}
          {rawContent ? (
            <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="cursor-pointer px-5 py-4 text-sm font-extrabold text-slate-800 sm:px-6">
                View Raw Source Data
              </summary>

              <div className="border-t border-slate-100 p-5 sm:p-6">
                <pre className="max-h-[500px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-200">
                  {rawContent}
                </pre>
              </div>
            </details>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Metadata */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900">
              Content Information
            </h2>

            <div className="mt-5 space-y-4">
              <MetaRow
                label="Status"
                value={formatLabel(status)}
              />

              <MetaRow
                label="Source"
                value={source}
              />

              <MetaRow
                label="Content Type"
                value={formatLabel(
                  contentType
                )}
              />

              <MetaRow
                label="Category"
                value={formatLabel(
                  category
                )}
              />

              {externalId ? (
                <MetaRow
                  label="External ID"
                  value={externalId}
                />
              ) : null}

              {createdAt ? (
                <MetaRow
                  label="Imported"
                  value={formatDate(
                    createdAt
                  )}
                />
              ) : null}

              {publishedAt ? (
                <MetaRow
                  label="Published"
                  value={formatDate(
                    publishedAt
                  )}
                />
              ) : null}

              {expiryDate ? (
                <MetaRow
                  label="Expiry"
                  value={formatDate(
                    expiryDate
                  )}
                />
              ) : null}
            </div>
          </section>

          {/* Actions */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-slate-900">
              Review Actions
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Only approve content after checking the official
              source and important details.
            </p>

            {isPublished ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-extrabold text-emerald-800">
                  This item is already published.
                </p>
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {canApprove ? (
                  <form
                    action={updateStatus.bind(
                      null,
                      id,
                      "approved"
                    )}
                  >
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white transition hover:bg-emerald-700"
                    >
                      ✓ Approve Content
                    </button>
                  </form>
                ) : null}

                {normalizeStatus(status) !==
                "rejected" ? (
                  <form
                    action={updateStatus.bind(
                      null,
                      id,
                      "rejected"
                    )}
                  >
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-700 transition hover:bg-red-100"
                    >
                      ✕ Reject Content
                    </button>
                  </form>
                ) : null}

                <form
                  action={deleteItem.bind(
                    null,
                    id
                  )}
                >
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
                  >
                    Delete From Queue
                  </button>
                </form>
              </div>
            )}
          </section>

          {/* Safety notice */}
          <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
                ⚠️
              </div>

              <div>
                <h2 className="text-xs font-extrabold text-amber-900">
                  Verify Before Publishing
                </h2>

                <p className="mt-1 text-xs leading-5 text-amber-800/80">
                  Check title, organization, dates, eligibility,
                  application links and the original official
                  notification before approving imported content.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/admin/import-queue"
      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition hover:bg-slate-50"
    >
      ← Import Queue
    </Link>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-bold leading-5 text-slate-700">
        {value}
      </p>
    </div>
  );
}

function EmptyReference({
  label,
}: {
  label: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-extrabold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        No reference URL available.
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    normalizeStatus(status);

  if (normalized === "pending") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[10px] font-extrabold uppercase text-amber-700">
        PENDING
      </span>
    );
  }

  if (normalized === "approved") {
    return (
      <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[10px] font-extrabold uppercase text-blue-700">
        APPROVED
      </span>
    );
  }

  if (normalized === "published") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase text-emerald-700">
        PUBLISHED
      </span>
    );
  }

  if (normalized === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-[10px] font-extrabold uppercase text-red-700">
        REJECTED
      </span>
    );
  }

  if (normalized === "duplicate") {
    return (
      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase text-slate-600">
        DUPLICATE
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase text-slate-600">
      {formatLabel(status)}
    </span>
  );
}

function normalizeStatus(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}