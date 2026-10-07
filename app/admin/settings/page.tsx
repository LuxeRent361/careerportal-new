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

async function saveSettings(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/settings");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const siteName =
    String(formData.get("site_name") || "").trim();

  const siteUrl =
    String(formData.get("site_url") || "").trim();

  const siteDescription =
    String(formData.get("site_description") || "").trim();

  const contactEmail =
    String(formData.get("contact_email") || "").trim();

  const maintenanceMode =
    formData.get("maintenance_mode") === "on";

  const maintenanceMessage =
    String(
      formData.get("maintenance_message") || ""
    ).trim();

  if (!siteName || !siteUrl || !siteDescription) {
    redirect(
      "/admin/settings?error=Site name, URL and description are required."
    );
  }

  const supabase = createAdminClient();

  const settings = [
    {
      setting_key: "site_name",
      setting_value: siteName,
    },
    {
      setting_key: "site_url",
      setting_value: siteUrl,
    },
    {
      setting_key: "site_description",
      setting_value: siteDescription,
    },
    {
      setting_key: "contact_email",
      setting_value: contactEmail,
    },
    {
      setting_key: "maintenance_mode",
      setting_value: maintenanceMode ? "true" : "false",
    },
    {
      setting_key: "maintenance_message",
      setting_value:
        maintenanceMessage ||
        "CareerPortal is currently undergoing maintenance. Please check back soon.",
    },
  ];

  for (const setting of settings) {
    const { data: existing, error: findError } =
      await supabase
        .from("site_settings")
        .select("id")
        .eq("setting_key", setting.setting_key)
        .maybeSingle();

    if (findError) {
      console.error(
        "Settings lookup error:",
        findError
      );

      redirect(
        `/admin/settings?error=${encodeURIComponent(
          findError.message
        )}`
      );
    }

    if (existing?.id) {
      const { error: updateError } =
        await supabase
          .from("site_settings")
          .update({
            setting_value: setting.setting_value,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

      if (updateError) {
        console.error(
          "Settings update error:",
          updateError
        );

        redirect(
          `/admin/settings?error=${encodeURIComponent(
            updateError.message
          )}`
        );
      }
    } else {
      const { error: insertError } =
        await supabase
          .from("site_settings")
          .insert(setting);

      if (insertError) {
        console.error(
          "Settings insert error:",
          insertError
        );

        redirect(
          `/admin/settings?error=${encodeURIComponent(
            insertError.message
          )}`
        );
      }
    }
  }

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/maintenance");

  redirect("/admin/settings?saved=true");
}

function getSetting(
  settings: Array<{
    setting_key: string;
    setting_value: string | null;
  }>,
  key: string,
  fallback = ""
) {
  return (
    settings.find(
      (setting) => setting.setting_key === key
    )?.setting_value ?? fallback
  );
}

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/settings");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const query = await searchParams;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select(
      "setting_key,setting_value,updated_at"
    )
    .order("setting_key", {
      ascending: true,
    });

  const settings = data ?? [];

  const siteName = getSetting(
    settings,
    "site_name",
    "CareerPortal"
  );

  const siteUrl = getSetting(
    settings,
    "site_url",
    "https://careerportal.space"
  );

  const siteDescription = getSetting(
    settings,
    "site_description",
    "Government Jobs, Private Jobs, Results, Admit Cards, Exams and Education"
  );

  const contactEmail = getSetting(
    settings,
    "contact_email"
  );

  const maintenanceMode =
    getSetting(
      settings,
      "maintenance_mode",
      "false"
    ) === "true";

  const maintenanceMessage = getSetting(
    settings,
    "maintenance_message",
    "CareerPortal is currently undergoing maintenance. Please check back soon."
  );

  const latestUpdated =
    settings.length > 0
      ? settings
          .map((item) => item.updated_at)
          .filter(Boolean)
          .sort()
          .reverse()[0]
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
          System
        </p>

        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Website Settings
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Manage your website identity, contact information,
          maintenance mode and basic website configuration.
        </p>
      </div>

      {/* Success */}
      {query.saved === "true" ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm">
            ✓
          </div>

          <div>
            <p className="text-sm font-extrabold text-emerald-800">
              Settings saved successfully
            </p>

            <p className="mt-1 text-xs text-emerald-700">
              Your website configuration has been updated.
            </p>
          </div>
        </div>
      ) : null}

      {/* Error */}
      {query.error || error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-extrabold text-red-800">
            Unable to load or save settings
          </p>

          <p className="mt-1 text-xs leading-5 text-red-700">
            {query.error ||
              error?.message ||
              "An unknown error occurred."}
          </p>
        </div>
      ) : null}

      {/* Current status */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Website Status
            </p>

            <h2 className="mt-1 text-lg font-extrabold text-slate-900">
              {maintenanceMode
                ? "Maintenance Mode Active"
                : "Website Online"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {maintenanceMode
                ? "Public visitors are being redirected to the maintenance page."
                : "The public website is currently available to visitors."}
            </p>
          </div>

          <div
            className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-extrabold ${
              maintenanceMode
                ? "bg-amber-50 text-amber-700"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                maintenanceMode
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />

            {maintenanceMode
              ? "MAINTENANCE"
              : "ONLINE"}
          </div>
        </div>
      </section>

      {/* Settings Form */}
      <form action={saveSettings} className="space-y-6">
        {/* Website Identity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Website Identity
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Basic information used across CareerPortal.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <label
                htmlFor="site_name"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Website Name
              </label>

              <input
                id="site_name"
                name="site_name"
                required
                defaultValue={siteName}
                placeholder="CareerPortal"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="site_url"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Website URL
              </label>

              <input
                id="site_url"
                name="site_url"
                type="url"
                required
                defaultValue={siteUrl}
                placeholder="https://careerportal.space"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="site_description"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Website Description
              </label>

              <textarea
                id="site_description"
                name="site_description"
                required
                rows={4}
                defaultValue={siteDescription}
                placeholder="Government Jobs, Private Jobs, Results, Admit Cards, Exams and Education"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                Keep this clear and relevant to the actual content
                of your website.
              </p>
            </div>

            <div>
              <label
                htmlFor="contact_email"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Contact Email
              </label>

              <input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={contactEmail}
                placeholder="support@example.com"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                This can be used on the Contact page and for
                website communication.
              </p>
            </div>
          </div>
        </section>

        {/* Maintenance */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-slate-900">
              Maintenance Mode
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Temporarily hide the public website while you work
              on updates.
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                name="maintenance_mode"
                defaultChecked={maintenanceMode}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />

              <span>
                <span className="block text-sm font-extrabold text-slate-800">
                  Enable Maintenance Mode
                </span>

                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Visitors will see the maintenance page. Authorized
                  administrators can continue accessing the admin
                  area.
                </span>
              </span>
            </label>

            <div>
              <label
                htmlFor="maintenance_message"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Maintenance Message
              </label>

              <textarea
                id="maintenance_message"
                name="maintenance_message"
                rows={4}
                defaultValue={maintenanceMessage}
                placeholder="CareerPortal is currently undergoing maintenance. Please check back soon."
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <p className="mt-2 text-xs text-slate-400">
                This message is stored for the maintenance page.
              </p>
            </div>
          </div>
        </section>

        {/* Save */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-extrabold text-slate-800">
              Save website configuration
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Changes are applied to the website after saving.
            </p>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"
          >
            Save Settings
          </button>
        </div>
      </form>

      {/* Information */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-lg shadow-sm">
            ℹ️
          </div>

          <div>
            <h2 className="text-sm font-extrabold text-blue-900">
              Configuration Information
            </h2>

            <p className="mt-1 text-xs leading-5 text-blue-800/80">
              Settings are stored securely in the existing
              site_settings table. Service-level access is used only
              after the current user has been verified as an
              authorized administrator.
            </p>

            {latestUpdated ? (
              <p className="mt-3 text-[11px] font-semibold text-blue-700">
                Last configuration update:{" "}
                {formatDate(latestUpdated)}
              </p>
            ) : null}
          </div>
        </div>
      </section>
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