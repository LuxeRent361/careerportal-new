import Link from "next/link";
import { redirect } from "next/navigation";

import AdminSidebar from "@/app/admin/components/AdminSidebar";
import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/profile");
  }

  const isSuperAdmin =
    admin.role === "super_admin" ||
    admin.role === "superadmin";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-blue-600">
              Administration
            </p>

            <p className="mt-0.5 text-sm font-bold text-slate-900">
              CareerPortal Control Center
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
            >
              View Website
            </Link>

            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-extrabold text-white">
                {admin.email
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <div className="hidden min-w-0 sm:block">
                <p className="max-w-[180px] truncate text-xs font-bold text-slate-800">
                  {admin.full_name || admin.email}
                </p>

                <p className="text-[10px] font-semibold text-slate-500">
                  {isSuperAdmin
                    ? "Super Admin"
                    : "Administrator"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-[1600px] flex-col lg:flex-row">
        <AdminSidebar />

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}