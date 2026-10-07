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

async function createTestimonial(formData: FormData) {
  "use server";

  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/testimonials/new");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const name = String(formData.get("name") || "").trim();
  const role =
    String(formData.get("role") || "").trim() || null;
  const message = String(
    formData.get("message") || ""
  ).trim();

  const avatarUrl =
    String(formData.get("avatar_url") || "").trim() ||
    null;

  const ratingValue = String(
    formData.get("rating") || ""
  ).trim();

  const status =
    String(formData.get("status") || "pending").trim() ||
    "pending";

  if (!name) {
    redirect(
      "/admin/testimonials/new?error=Name%20is%20required"
    );
  }

  if (!message) {
    redirect(
      "/admin/testimonials/new?error=Testimonial%20message%20is%20required"
    );
  }

  if (!["pending", "approved", "rejected"].includes(status)) {
    redirect(
      "/admin/testimonials/new?error=Invalid%20status"
    );
  }

  let rating: number | null = null;

  if (ratingValue) {
    const parsedRating = Number(ratingValue);

    if (
      !Number.isInteger(parsedRating) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      redirect(
        "/admin/testimonials/new?error=Rating%20must%20be%20between%201%20and%205"
      );
    }

    rating = parsedRating;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("testimonials")
    .insert({
      name,
      role,
      message,
      rating,
      avatar_url: avatarUrl,
      status,
    })
    .select("id,name")
    .single();

  if (error) {
    redirect(
      `/admin/testimonials/new?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  await supabase.from("activity_logs").insert({
    actor_user_id: user.id,
    actor_email: user.email,
    action: "create",
    entity_type: "testimonial",
    entity_id: data.id,
    description: `Created testimonial from ${data.name}.`,
    metadata: {
      status,
      rating,
    },
  });

  redirect(
    `/admin/testimonials/${data.id}?created=1`
  );
}

export default async function NewTestimonialPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin/testimonials/new");
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
            Content Management
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Add Testimonial
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Add customer or user feedback that can be displayed on
            CareerPortal.
          </p>
        </div>

        <Link
          href="/admin/testimonials"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Back to Testimonials
        </Link>
      </div>

      {params.error && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {params.error}
        </div>
      )}

      <form
        action={createTestimonial}
        className="mt-7 space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Personal Information"
            title="Person Details"
            description="Enter the name and optional role of the person giving the testimonial."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <Field
              label="Name"
              name="name"
              required
              placeholder="e.g. Rahul Kumar"
            />

            <Field
              label="Role / Occupation"
              name="role"
              placeholder="e.g. Government Job Aspirant"
            />

            <div className="md:col-span-2">
              <Field
                label="Avatar URL"
                name="avatar_url"
                type="url"
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Feedback"
            title="Testimonial Content"
            description="Write the complete feedback that should be shown to visitors."
          />

          <div className="mt-6">
            <TextArea
              label="Message"
              name="message"
              required
              rows={9}
              placeholder="Write the user's testimonial or feedback..."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <SectionHeader
            eyebrow="Review"
            title="Rating & Status"
            description="Set the rating and decide whether the testimonial is pending, approved or rejected."
          />

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <SelectField
              label="Rating"
              name="rating"
              options={[
                ["", "No Rating"],
                ["5", "★★★★★ — 5 Stars"],
                ["4", "★★★★☆ — 4 Stars"],
                ["3", "★★★☆☆ — 3 Stars"],
                ["2", "★★☆☆☆ — 2 Stars"],
                ["1", "★☆☆☆☆ — 1 Star"],
              ]}
            />

            <SelectField
              label="Status"
              name="status"
              defaultValue="pending"
              options={[
                ["pending", "Pending"],
                ["approved", "Approved"],
                ["rejected", "Rejected"],
              ]}
            />
          </div>

          <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-xs font-extrabold text-blue-700">
              Publishing note
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700/80">
              Only testimonials with an approved status should normally
              be displayed on the public website.
            </p>
          </div>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/admin/testimonials"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-sm font-extrabold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>

          <button
            type="submit"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-7 text-sm font-extrabold text-white hover:bg-blue-700"
          >
            Create Testimonial
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="border-b border-slate-100 pb-5">
      <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-blue-600">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-xl font-extrabold text-slate-900">
        {title}
      </h2>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue = "",
}: {
  label: string;
  name: string;
  options: [string, string][];
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}
      </span>

      <select
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  name,
  required = false,
  rows,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-extrabold text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">*</span>
        )}
      </span>

      <textarea
        name={name}
        required={required}
        rows={rows}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none focus:border-blue-500 focus:bg-white"
      />
    </label>
  );
}