"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

type HeaderUser = {
  id: string;
  email: string | null;
};

export default function Header() {
  const [user, setUser] = useState<HeaderUser | null>(null);
  const [checkingUser, setCheckingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function checkAdmin() {
      try {
        const response = await fetch("/api/auth/destination", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          if (mounted) {
            setIsAdmin(false);
            setAdminRole(null);
          }
          return;
        }

        const data = await response.json();

        if (!mounted) return;

        setIsAdmin(Boolean(data.isAdmin));
        setAdminRole(data.role ?? null);
      } catch (error) {
        console.error("Admin status check failed:", error);

        if (mounted) {
          setIsAdmin(false);
          setAdminRole(null);
        }
      }
    }

    function updateUser(currentUser: {
      id: string;
      email?: string | null;
    } | null) {
      if (!mounted) return;

      if (currentUser) {
        setUser({
          id: currentUser.id,
          email: currentUser.email ?? null,
        });

        checkAdmin();
      } else {
        setUser(null);
        setIsAdmin(false);
        setAdminRole(null);
      }

      setCheckingUser(false);
    }

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      updateUser(currentUser);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        updateUser(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMobile}
          className="flex items-center gap-2"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-extrabold text-white shadow-sm">
            CP
          </div>

          <div>
            <div className="text-lg font-extrabold tracking-tight text-slate-900">
              CareerPortal
            </div>

            <div className="-mt-1 hidden text-[10px] font-medium text-slate-500 sm:block">
              Jobs • Exams • Results • Education
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink href="/">Home</NavLink>
          <NavLink href="/jobs">Jobs</NavLink>
          <NavLink href="/exam">Exams</NavLink>
          <NavLink href="/results">Results</NavLink>
          <NavLink href="/admit-cards">Admit Cards</NavLink>
          <NavLink href="/education">Education</NavLink>
        </nav>

        {/* Desktop Right Side */}
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/search"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            Search
          </Link>

          {/* Admin Panel */}
          {!checkingUser && isAdmin && (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-100"
              title={
                adminRole === "super_admin" ||
                adminRole === "superadmin"
                  ? "Super Admin Panel"
                  : "Admin Panel"
              }
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-600 text-[10px] font-extrabold text-white">
                A
              </span>

              <span>Admin Panel</span>
            </Link>
          )}

          {checkingUser ? (
            <div className="h-10 w-24 animate-pulse rounded-xl bg-slate-100" />
          ) : user ? (
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-xs font-extrabold">
                {getInitial(user.email)}
              </span>

              <span>Profile</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
        >
          <div className="space-y-1.5">
            <span
              className={`block h-0.5 w-5 bg-slate-700 transition ${
                mobileOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />

            <span
              className={`block h-0.5 w-5 bg-slate-700 transition ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />

            <span
              className={`block h-0.5 w-5 bg-slate-700 transition ${
                mobileOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav className="mx-auto space-y-1 px-4 py-4 sm:px-6">
            <MobileLink href="/" onClick={closeMobile}>
              Home
            </MobileLink>

            <MobileLink href="/jobs" onClick={closeMobile}>
              Government Jobs
            </MobileLink>

            <MobileLink href="/private-jobs" onClick={closeMobile}>
              Private Jobs
            </MobileLink>

            <MobileLink href="/exam" onClick={closeMobile}>
              Exams
            </MobileLink>

            <MobileLink href="/results" onClick={closeMobile}>
              Results
            </MobileLink>

            <MobileLink href="/admit-cards" onClick={closeMobile}>
              Admit Cards
            </MobileLink>

            <MobileLink href="/education" onClick={closeMobile}>
              Education
            </MobileLink>

            <MobileLink href="/search" onClick={closeMobile}>
              Search
            </MobileLink>

            {/* Mobile Admin Panel */}
            {!checkingUser && isAdmin && (
              <Link
                href="/admin"
                onClick={closeMobile}
                className="mt-2 flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm font-extrabold text-blue-700"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-extrabold text-white">
                  A
                </span>

                <span>Admin Panel</span>
              </Link>
            )}

            {checkingUser ? (
              <div className="px-4 py-3 text-sm font-semibold text-slate-400">
                Checking account...
              </div>
            ) : user ? (
              <MobileLink href="/profile" onClick={closeMobile}>
                Profile
              </MobileLink>
            ) : (
              <MobileLink href="/login" onClick={closeMobile}>
                Login
              </MobileLink>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

function getInitial(email: string | null) {
  if (!email) return "U";

  return email.trim().charAt(0).toUpperCase() || "U";
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-700"
    >
      {children}
    </Link>
  );
}

function MobileLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-blue-50 hover:text-blue-700"
    >
      {children}
    </Link>
  );
}