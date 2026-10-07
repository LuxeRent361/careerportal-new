import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

async function updateNotification(
  id: string,
  formData: FormData
) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/admin/notifications/${id}`);
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const title = String(formData.get("title") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const type = String(formData.get("type") || "info").trim();
  const targetType = String(
    formData.get("target_type") || "admin"
  ).trim();

  const isActive =
    formData.get("is_active") === "on";

  if (!title || !message) {
    redirect(
      `/admin/notifications/${id}?error=${encodeURIComponent(
        "Title and message are required."
      )}`
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .update({
      title,
      message,
      type,
      target_type: targetType,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Update notification error:", error);

    redirect(
      `/admin/notifications/${id}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath("/admin/notifications");
  revalidatePath(`/admin/notifications/${id}`);
  revalidatePath("/admin");

  redirect("/admin/notifications");
}

async function deleteNotification(id: string) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/notifications");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Delete notification error:", error);

    redirect(
      `/admin/notifications/${id}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath("/admin/notifications");
  revalidatePath("/admin");

  redirect("/admin/notifications");
}

export default async function EditNotificationPage({
  params,
  searchParams,
}: {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/notifications");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const { id } = await params;
  const query = await searchParams;

  const supabase = createAdminClient();

  const { data: notification, error } = await supabase
    .from("notifications")
    .select(
      "id,title,message,type,target_type,target_user_id,is_read,is_active,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !notification) {
    redirect("/admin/notifications");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            System
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Edit Notification
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Update this notification or change its active status.
          </p>
        </div>

        <Link
          href="/admin/notifications"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
        >
          ← Back
        </Link>
      </div>

      {/* Error */}
      {query.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {query.error}
        </div>
      ) : null}

      {/* Form */}
      <form
        action={updateNotification.bind(null, notification.id)}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Notification Details
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Modify the notification information.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="title"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Title
              </label>

              <input
                id="title"
                name="title"
                required
                defaultValue={notification.title}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="message"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Message
              </label>

              <textarea
                id="message"
                name="message"
                required
                rows={7}
                defaultValue={notification.message}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="type"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Notification Type
                </label>

                <select
                  id="type"
                  name="type"
                  defaultValue={notification.type}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="info">Information</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="source">Source Update</option>
                  <option value="content">Content Update</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="target_type"
                  className="mb-2 block text-sm font-bold text-slate-700"
                >
                  Target
                </label>

                <select
                  id="target_type"
                  name="target_type"
                  defaultValue={notification.target_type}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="admin">
                    Admin
                  </option>
                  <option value="all">
                    All Users
                  </option>
                  <option value="user">
                    Specific User
                  </option>
                </select>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={notification.is_active}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />

              <span>
                <span className="block text-sm font-extrabold text-slate-800">
                  Active Notification
                </span>

                <span className="mt-0.5 block text-xs text-slate-500">
                  Keep this notification active in the system.
                </span>
              </span>
            </label>
          </div>
        </section>

        {/* Metadata */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-base font-extrabold text-slate-900">
            Information
          </h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <InfoItem
              label="Status"
              value={
                notification.is_read
                  ? "Read"
                  : "Unread"
              }
            />

            <InfoItem
              label="Created"
              value={formatDate(notification.created_at)}
            />

            <InfoItem
              label="Last Updated"
              value={formatDate(notification.updated_at)}
            />

            <InfoItem
              label="Target"
              value={notification.target_type}
            />
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-extrabold text-red-700 hover:bg-red-100"
            formAction={deleteNotification.bind(
              null,
              notification.id
            )}
          >
            Delete Notification
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/notifications"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
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
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-bold capitalize text-slate-700">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Unavailable";
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