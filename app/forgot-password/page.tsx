"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
const [email, setEmail] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [success, setSuccess] = useState("");

async function handleReset(e: FormEvent<HTMLFormElement>) {
e.preventDefault();

setError("");
setSuccess("");

const trimmedEmail = email.trim();

if (!trimmedEmail) {
  setError("Please enter your email address.");
  return;
}

setLoading(true);

try {
  const supabase = createClient();

  const { error: resetError } =
    await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

  if (resetError) {
    setError(resetError.message);
    return;
  }

  setSuccess(
    "Password reset link has been sent. Please check your email inbox."
  );
} catch {
  setError(
    "Something went wrong. Please try again after some time."
  );
} finally {
  setLoading(false);
}
}

return (
<main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-10 sm:px-6 lg:py-14">
<div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">

    {/* Left Section */}
    <section className="relative hidden overflow-hidden bg-blue-600 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
      <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-white/10" />

      <div className="relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-sm font-extrabold text-blue-600 shadow-sm">
            CP
          </span>

          <span className="text-xl font-extrabold tracking-tight">
            CareerPortal
          </span>
        </Link>

        <div className="mt-20">
          <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-50">
            Secure Account Recovery
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight xl:text-5xl">
            Get back to your
            <br />
            CareerPortal
            <br />
            account.
          </h1>

          <p className="mt-6 max-w-md text-sm leading-7 text-blue-100 xl:text-base">
            Forgot your password? Enter your registered email address
            and we&apos;ll send you a secure password reset link.
          </p>
        </div>
      </div>

      <div className="relative z-10 mt-12 space-y-4 text-sm text-blue-50">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 font-bold">
            ✓
          </span>
          Secure recovery process
        </div>

        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 font-bold">
            ✓
          </span>
          Reset link delivered by email
        </div>

        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 font-bold">
            ✓
          </span>
          Your account remains protected
        </div>
      </div>
    </section>

    {/* Form Section */}
    <section className="p-6 sm:p-10 lg:p-12 xl:p-14">
      <div className="mx-auto max-w-md">

        {/* Mobile Logo */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 lg:hidden"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white">
            CP
          </span>

          <span className="text-lg font-extrabold text-slate-900">
            CareerPortal
          </span>
        </Link>

        <div className="mb-8">
          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl">
            🔑
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Forgot password?
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Enter your registered email and we&apos;ll send you a
            secure link to create a new password.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium leading-6 text-emerald-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-5">
          <div>
            <label
              htmlFor="forgotEmail"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Email address
            </label>

            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                ✉
              </span>

              <input
                id="forgotEmail"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Sending reset link...
              </>
            ) : (
              "Send reset link →"
            )}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs font-semibold text-slate-400">
            Remembered your password?
          </span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <Link
          href="/login"
          className="flex h-12 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        >
          ← Back to Sign in
        </Link>

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-semibold text-slate-500 transition hover:text-blue-600"
        >
          Back to CareerPortal
        </Link>
      </div>
    </section>
  </div>
</main>

);
}