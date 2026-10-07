"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function loadAccount() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(currentUser);
      setLoading(false);
    }

    loadAccount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
  (
    _event: import("@supabase/supabase-js").AuthChangeEvent,
    session: import("@supabase/supabase-js").Session | null
  ) => {
    if (!mounted) return;

    setUser(session?.user ?? null);
    setLoading(false);
  }
);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="h-8 w-48 rounded bg-slate-200" />
            <div className="mt-4 h-5 w-72 rounded bg-slate-100" />
            <div className="mt-8 h-24 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-[70vh] bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-extrab800 text-blue-600">
              CP
            </div>

            <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
              Account
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Please login to view your account information.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const email = user.email ?? "No email available";

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            My Account
          </p>

          <h1 className="mt-2 text-3xl font-extrab800 tracking-tight text-slate-900">
            Account information
          </h1>

          <p className="mt-2 text-slate-600">
            Manage and view your CareerPortal account details.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white sm:px-8">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 text-xl font-extrabold ring-1 ring-white/20">
                {email.charAt(0).toUpperCase()}
              </div>

              <div>
                <p className="text-sm font-medium text-blue-100">
                  Signed in as
                </p>
                <p className="mt-1 break-all text-lg font-bold">{email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-5 p-6 sm:p-8">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Email address
              </p>

              <p className="mt-2 break-all text-base font-semibold text-slate-900">
                {email}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Account ID
              </p>

              <p className="mt-2 break-all font-mono text-sm text-slate-700">
                {user.id}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/profile"
                className="inline-flex flex-1 items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                Open Profile
              </Link>

              <Link
                href="/"
                className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}