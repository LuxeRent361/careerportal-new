"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (loginError) {
        setError(loginError.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError("Login could not be completed.");
        setLoading(false);
        return;
      }

      /*
       * If the user originally tried to open a protected page,
       * send them back there.
       */
      if (
        next &&
        next.startsWith("/") &&
        !next.startsWith("//")
      ) {
        router.replace(next);
        router.refresh();
        return;
      }

      /*
       * Ask our server whether the current authenticated user
       * is an administrator.
       */
      const response = await fetch("/api/auth/redirect", {
        method: "GET",
        cache: "no-store",
      });

      if (response.ok) {
        const result = await response.json();

        if (result.isAdmin) {
          router.replace("/admin");
          router.refresh();
          return;
        }
      }

      /*
       * Normal authenticated users go to Profile.
       */
      router.replace("/profile");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:py-16">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-2">
        {/* Left */}
        <section className="hidden bg-blue-600 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-black text-blue-600">
                CP
              </span>

              <span className="text-xl font-bold">
                CareerPortal
              </span>
            </Link>

            <div className="mt-20 max-w-md">
              <p className="text-sm font-semibold uppercase tracking-widest text-blue-100">
                CareerPortal Account
              </p>

              <h1 className="mt-4 text-4xl font-bold leading-tight">
                Welcome back.
              </h1>

              <p className="mt-5 text-base leading-7 text-blue-100">
                Login to access your CareerPortal account. Authorized
                administrators are automatically taken to the secure
                admin dashboard.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-white/20 bg-white/10 p-5">
            <p className="text-sm font-semibold">
              Jobs • Exams • Results • Education
            </p>

            <p className="mt-2 text-sm leading-6 text-blue-100">
              One account for the complete CareerPortal experience.
            </p>
          </div>
        </section>

        {/* Right */}
        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto max-w-md">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 lg:hidden"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">
                CP
              </span>

              CareerPortal
            </Link>

            <div className="mt-8 lg:mt-0">
              <p className="text-sm font-semibold text-blue-600">
                Account Login
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Sign in to your account
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your registered email and password to continue.
              </p>
            </div>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Forgot password?
                  </Link>
                </div>

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-xs font-medium text-slate-400">
                NEW TO CAREERPORTAL?
              </span>

              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Link
              href="/signup"
              className="block w-full rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-center text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              Create an account
            </Link>

            <p className="mt-7 text-center text-xs leading-5 text-slate-400">
              By continuing, you agree to use CareerPortal
              responsibly and follow the website terms and policies.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}