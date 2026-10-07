"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuItem = {
  href: string;
  label: string;
  icon: string;
};

const mainMenu: MenuItem[] = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: "▦",
  },
  {
    href: "/admin/jobs",
    label: "Government Jobs",
    icon: "💼",
  },
  {
    href: "/admin/private-jobs",
    label: "Private Jobs",
    icon: "🏢",
  },
  {
    href: "/admin/exams",
    label: "Exams",
    icon: "📝",
  },
  {
    href: "/admin/results",
    label: "Results",
    icon: "🏆",
  },
  {
    href: "/admin/admit-cards",
    label: "Admit Cards",
    icon: "🎫",
  },
  {
    href: "/admin/education",
    label: "Education",
    icon: "🎓",
  },
];

const managementMenu: MenuItem[] = [
  {
    href: "/admin/categories",
    label: "Categories",
    icon: "🗂️",
  },
  {
    href: "/admin/faqs",
    label: "FAQs",
    icon: "❓",
  },
  {
    href: "/admin/testimonials",
    label: "Testimonials",
    icon: "💬",
  },
  {
    href: "/admin/homepage",
    label: "Homepage",
    icon: "🏠",
  },
  {
    href: "/admin/pages",
    label: "Pages",
    icon: "📄",
  },
];

const automationMenu: MenuItem[] = [
  {
    href: "/admin/sources",
    label: "Source Monitoring",
    icon: "🌐",
  },
  {
    href: "/admin/import-queue",
    label: "Import Queue",
    icon: "📥",
  },
  {
    href: "/admin/sources/history",
    label: "Monitoring History",
    icon: "📊",
  },
];

const systemMenu: MenuItem[] = [
  {
    href: "/admin/users",
    label: "Users",
    icon: "👥",
  },
  {
    href: "/admin/admin-users",
    label: "Admin Access",
    icon: "🛡️",
  },
  {
    href: "/admin/notifications",
    label: "Notifications",
    icon: "🔔",
  },
  {
    href: "/admin/logs",
    label: "Activity Logs",
    icon: "📋",
  },
  {
    href: "/admin/settings",
    label: "Website Settings",
    icon: "⚙️",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full shrink-0 border-b border-slate-200 bg-white lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:w-72 lg:overflow-y-auto lg:border-b-0 lg:border-r">
      <div className="p-4 sm:p-5">
        <div className="mb-5 rounded-2xl bg-blue-600 p-4 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-lg font-extrabold">
              CP
            </div>

            <div className="min-w-0">
              <p className="text-sm font-extrabold">
                CareerPortal
              </p>

              <p className="mt-0.5 text-xs font-medium text-blue-100">
                Admin Control Center
              </p>
            </div>
          </div>
        </div>

        <SidebarSection
          title="MAIN"
          items={mainMenu}
          pathname={pathname}
        />

        <SidebarSection
          title="CONTENT MANAGEMENT"
          items={managementMenu}
          pathname={pathname}
        />

        <SidebarSection
          title="AUTOMATION"
          items={automationMenu}
          pathname={pathname}
        />

        <SidebarSection
          title="SYSTEM"
          items={systemMenu}
          pathname={pathname}
        />

        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

            <span className="text-xs font-extrabold text-emerald-700">
              SYSTEM ONLINE
            </span>
          </div>

          <p className="mt-2 text-xs leading-5 text-emerald-700/80">
            CareerPortal administration system is active.
          </p>
        </div>
      </div>
    </aside>
  );
}

function SidebarSection({
  title,
  items,
  pathname,
}: {
  title: string;
  items: MenuItem[];
  pathname: string;
}) {
  return (
    <div className="mb-6">
      <p className="mb-2 px-3 text-[10px] font-extrabold tracking-[0.16em] text-slate-400">
        {title}
      </p>

      <div className="space-y-1">
        {items.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href ||
                pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm ${
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.icon}
              </span>

              <span className="truncate">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}