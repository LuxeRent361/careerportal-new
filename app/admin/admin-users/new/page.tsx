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

export default async function NewAdminUserPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/admin-users/new");
  }

  const currentAdmin = await getCurrentAdmin();

  if (!currentAdmin) {
    redirect("/profile");
  }

  const isSuperAdmin =
    currentAdmin.role === "super_admin" ||
    currentAdmin.role === "superadmin";

  async function createAdmin(formData: FormData) {
    "use server";

    const loggedInUser = await getCurrentUser();

    if (!loggedInUser) {
      redirect("/login?next=/admin/admin-users/new");
    }

    const loggedInAdmin = await getCurrentAdmin();

    if (!loggedInAdmin) {
      redirect("/profile");
    }

    const canManage =
      loggedInAdmin.role === "super_admin" ||
      loggedInAdmin.role === "superadmin";

    if (!canManage) {
      redirect("/admin/admin-users?error=permission");
    }

    const email = String(
      formData.get("email") || ""
    )
      .trim()
      .toLowerCase();

    const fullName = String(
      formData.get("full_name") || ""
    ).trim();

    const role = String(
      formData.get("role") || "admin"
    ).trim();

    const isActive =
      String(formData.get("is_active")) === "true";

    if (!email) {
      redirect(
        "/admin/admin-users/new?error=email-required"
      );
    }

    if (!isValidEmail(email)) {
      redirect(
        "/admin/admin-users/new?error=invalid-email"
      );
    }

    if (
      role !== "admin" &&
      role !== "super_admin" &&
      role !== "superadmin"
    ) {
      redirect(
        "/admin/admin-users/new?error=invalid-role"
      );
    }

    const supabase = createAdminClient();

    const { data: existing } = await supabase
      .from("admin_users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (existing) {
      redirect(
        "/admin/admin-users/new?error=already-exists"
      );
    }

    const { data, error } = await supabase
      .from("admin_users")
      .insert({
        email,
        full_name: fullName || null,
        role,
        is_active: isActive,
      })
      .select("id,email,full_name,role,is_active")
      .single();

    if (error) {
      console.error(
        "Create administrator error:",
        error
      );

      redirect(
        `/admin/admin-users/new?error=${encodeURIComponent(
          error.message
        )}`
      );
    }

    await supabase.from("activity_logs").insert({
      actor_user_id: loggedInUser.id,
      actor_email: loggedInUser.email,
      action: "admin_created",
      entity_type: "admin_user",
      entity_id: data.id,
      description:
        `Administrator ${data.email} was added to CareerPortal.`,
      metadata: {
        email: data.email,
        role: data.role,
        is_active: data.is_active,
      },
    });

    redirect(
      "/admin/admin-users?success=created"
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Admin Access
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Add Administrator
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Create a new administrator record for CareerPortal.
          </p>
        </div>

        <Link
          href="/admin/admin-users"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
        >
          ← Back
        </Link>
      </div>

      {/* Permission warning */}
      {!isSuperAdmin ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-extrabold text-amber-800">
            Super Admin access required
          </p>

          <p className="mt-1 text-xs leading-6 text-amber-700">
            Only Super Admins can create or manage administrator
            accounts.
          </p>
        </div>
      ) : null}

      <form
        action={createAdmin}
        className="space-y-6"
      >
        {/* Basic information */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Administrator Details
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Enter the email that will be used for administrator
              authentication.
            </p>
          </div>

          <div className="grid gap-5 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Email Address *
              </label>

              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="admin@example.com"
                disabled={!isSuperAdmin}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              />

              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                This must match the email address of the Supabase
                authenticated user.
              </p>
            </div>

            <div>
              <label
                htmlFor="full_name"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Full Name
              </label>

              <input
                id="full_name"
                name="full_name"
                type="text"
                placeholder="Administrator Name"
                disabled={!isSuperAdmin}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="mb-2 block text-xs font-extrabold text-slate-700"
              >
                Role *
              </label>

              <select
                id="role"
                name="role"
                defaultValue="admin"
                disabled={!isSuperAdmin}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-slate-50"
              >
                <option value="admin">
                  Administrator
                </option>

                <option value="super_admin">
                  Super Admin
                </option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-xs font-extrabold text-slate-700">
                Account Status
              </label>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <label className="flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="is_active"
                    value="true"
                    defaultChecked
                    disabled={!isSuperAdmin}
                    className="h-4 w-4 accent-blue-600"
                  />

                  <span>
                    <span className="block text-sm font-extrabold text-slate-800">
                      Active
                    </span>

                    <span className="block text-xs text-slate-500">
                      Administrator can access the control center.
                    </span>
                  </span>
                </label>

                <label className="mt-4 flex cursor-pointer items-center gap-3">
                  <input
                    type="radio"
                    name="is_active"
                    value="false"
                    disabled={!isSuperAdmin}
                    className="h-4 w-4 accent-blue-600"
                  />

                  <span>
                    <span className="block text-sm font-extrabold text-slate-800">
                      Inactive
                    </span>

                    <span className="block text-xs text-slate-500">
                      Administrator will not be allowed into admin
                      areas.
                    </span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
              🔐
            </div>

            <div>
              <h3 className="text-sm font-extrabold text-blue-900">
                Important
              </h3>

              <p className="mt-1 text-xs leading-6 text-blue-800/80">
                Adding an administrator here does not create a
                Supabase Auth account. The user must already have,
                or separately receive, a Supabase authentication
                account using the same email address.
              </p>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/admin-users"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={!isSuperAdmin}
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Create Administrator
          </button>
        </div>
      </form>
    </div>
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}