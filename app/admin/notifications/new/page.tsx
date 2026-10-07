import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function createNotification(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/notifications/new");
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

  if (!title || !message) {
    redirect(
      "/admin/notifications/new?error=Title%20and%20message%20are%20required"
    );
  }

  const targetUserIdRaw = String(
    formData.get("target_user_id") || ""
  ).trim();

  const targetUserId = targetUserIdRaw || null;

  if (
    targetType === "user" &&
    !targetUserId
  ) {
    redirect(
      "/admin/notifications/new?error=Target%20user%20ID%20is%20required"
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("notifications")
    .insert({
      title,
      message,
      type,
      target_type: targetType,
      target_user_id: targetUserId,
      is_read: false,
      is_active: true,
    });

  if (error) {
    redirect(
      `/admin/notifications/new?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "create",
    entity_type: "notification",
    entity_id: null,
    description: `Created notification: ${title}`,
    metadata: {
      title,
      type,
      target_type: targetType,
      target_user_id: targetUserId,
    },
  });

  redirect("/admin/notifications?created=1");
}

export default async function NewNotificationPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/notifications/new");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const params = await searchParams;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">
            System
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Create Notification
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Create an admin or user notification from the CareerPortal
            control center.
          </p>
        </div>

        <Link
          href="/admin/notifications"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Back to Notifications
        </Link>
      </div>

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {params.error}
        </div>
      )}

      <form
        action={createNotification}
        className="mt-7 space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="border-b border-slate-100 pb-5">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
              Notification Details
            </p>

            <h2 className="mt-2 text-xl font-extrabold text-slate-900">
              Basic Information
            </h2>

            <p className="mt-1 text-sm leading-6 text-slate-500">
              Enter the notification title, message and notification type.
            </p>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="text-sm font-extrabold text-slate-700">
                Title
              </span>

              <input
                name="title"
                required
                maxLength={200}
                placeholder="Enter notification title"
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
              />
            </label>

            <label className="block">
              <span className="text-sm font-extrabold text-slate-700">
                Message
              </span>

              <textarea
                name="message"
                required
                rows={6}
                placeholder="Write the notification message..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
              />
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-extrabold text-slate-700">
                  Notification Type
                </span>

                <select
                  name="type"
                  defaultValue="info"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="info">
                    Information
                  </option>

                  <option value="success">
                    Success
                  </option>

                  <option value="warning">
                    Warning
                  </option>

                  <option value="error">
                    Error
                  </option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-extrabold text-slate-700">
                  Target
                </span>

                <select
                  name="target_type"
                  defaultValue="admin"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="admin">
                    Admin
                  </option>

                  <option value="user">
                    Specific User
                  </option>

                  <option value="all">
                    All Users
                  </option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-extrabold text-slate-700">
                Target User ID
              </span>

              <input
                name="target_user_id"
                placeholder="Required only when Target is Specific User"
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white"
              />

              <p className="mt-2 text-xs leading-5 text-slate-400">
                Leave this empty for Admin or All Users notifications.
              </p>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg text-white">
              🔔
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-blue-900">
                Notification status
              </h3>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                New notifications are created as active and unread.
                They will also be recorded in Activity Logs.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href="/admin/notifications"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-7 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
          >
            Create Notification
          </button>
        </div>
      </form>
    </div>
  );
}