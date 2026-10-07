import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";
import { createClient } from "@supabase/supabase-js";

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

async function deleteNotification(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/notifications");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();

  if (!id) {
    return;
  }

  const supabase = createAdminClient();

  await supabase
    .from("notifications")
    .delete()
    .eq("id", id);

  revalidatePath("/admin/notifications");
}

async function toggleRead(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/notifications");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const id = String(formData.get("id") || "").trim();
  const current = String(formData.get("current") || "false");

  if (!id) {
    return;
  }

  const supabase = createAdminClient();

  await supabase
    .from("notifications")
    .update({
      is_read: current !== "true",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/admin/notifications");
}

export default async function NotificationsAdminPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/notifications");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const supabase = createAdminClient();

  const { data: notifications, error } = await supabase
    .from("notifications")
    .select(
      "id,title,message,type,target_type,target_user_id,is_read,is_active,created_at,updated_at"
    )
    .order("created_at", {
      ascending: false,
    });

  const items = notifications ?? [];

  const total = items.length;
  const unread = items.filter((item) => !item.is_read).length;
  const active = items.filter((item) => item.is_active).length;
  const broadcast = items.filter(
    (item) => item.target_type === "admin"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            System
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Notifications
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Manage admin notifications, alerts and important
            system messages from one place.
          </p>
        </div>

        <Link
          href="/admin/notifications/new"
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700"
        >
          + New Notification
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Notifications"
          value={total}
          icon="🔔"
        />

        <StatCard
          label="Unread"
          value={unread}
          icon="📩"
        />

        <StatCard
          label="Active"
          value={active}
          icon="🟢"
        />

        <StatCard
          label="Admin Broadcasts"
          value={broadcast}
          icon="📢"
        />
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          Unable to load notifications: {error.message}
        </div>
      ) : null}

      {/* List */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Notification Center
              </h2>

              <p className="mt-1 text-xs font-medium text-slate-500">
                Review and manage system notifications.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-600">
              {total} total
            </span>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl">
              🔔
            </div>

            <h3 className="mt-4 text-base font-extrabold text-slate-900">
              No notifications yet
            </h3>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first notification to start managing
              important admin alerts.
            </p>

            <Link
              href="/admin/notifications/new"
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-blue-700"
            >
              Create Notification
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {items.map((notification) => (
              <div
                key={notification.id}
                className={`p-5 transition hover:bg-slate-50 ${
                  !notification.is_read
                    ? "bg-blue-50/30"
                    : ""
                }`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                          !notification.is_read
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {notification.is_read
                          ? "Read"
                          : "Unread"}
                      </span>

                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase text-slate-600">
                        {notification.type}
                      </span>

                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-700">
                        {notification.target_type}
                      </span>
                    </div>

                    <h3 className="mt-3 text-base font-extrabold text-slate-900">
                      {notification.title}
                    </h3>

                    <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                      {notification.message}
                    </p>

                    <p className="mt-3 text-xs font-medium text-slate-400">
                      {formatDate(notification.created_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link
                      href={`/admin/notifications/${notification.id}`}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 hover:bg-slate-50"
                    >
                      Edit
                    </Link>

                    <form action={toggleRead}>
                      <input
                        type="hidden"
                        name="id"
                        value={notification.id}
                      />

                      <input
                        type="hidden"
                        name="current"
                        value={String(notification.is_read)}
                      />

                      <button
                        type="submit"
                        className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-extrabold text-blue-700 hover:bg-blue-100"
                      >
                        {notification.is_read
                          ? "Mark Unread"
                          : "Mark Read"}
                      </button>
                    </form>

                    <form action={deleteNotification}>
                      <input
                        type="hidden"
                        name="id"
                        value={notification.id}
                      />

                      <button
                        type="submit"
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-lg">
          {icon}
        </span>
      </div>

      <p className="mt-4 text-2xl font-extrabold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Date unavailable";
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