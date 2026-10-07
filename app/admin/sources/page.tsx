"use client";

import { useState } from "react";

type Source = {
  name: string;
  code: string;
  type: string;
  description: string;
  status: "ready" | "monitoring" | "error";
};

const sources: Source[] = [
  {
    name: "Staff Selection Commission",
    code: "SSC",
    type: "Government Recruitment",
    description:
      "Monitor recruitment notices, examinations, results and important updates from SSC.",
    status: "ready",
  },
  {
    name: "Union Public Service Commission",
    code: "UPSC",
    type: "Government Recruitment",
    description:
      "Monitor UPSC examinations, recruitment advertisements and important notices.",
    status: "ready",
  },
  {
    name: "Railway Recruitment Board",
    code: "RRB",
    type: "Railway Recruitment",
    description:
      "Monitor railway recruitment and examination related updates.",
    status: "ready",
  },
  {
    name: "State Bank of India",
    code: "SBI",
    type: "Banking Recruitment",
    description:
      "Monitor SBI recruitment and examination related updates.",
    status: "ready",
  },
  {
    name: "All India Council for Technical Education",
    code: "AICTE",
    type: "Education",
    description:
      "Monitor official education and technical education announcements.",
    status: "ready",
  },
  {
    name: "LIC",
    code: "LIC",
    type: "Banking & Insurance",
    description:
      "Monitor recruitment and examination announcements.",
    status: "ready",
  },
];

export default function SourcesPage() {
  const [checking, setChecking] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [resultType, setResultType] = useState<
    "success" | "error" | ""
  >("");

  async function checkSource(source: Source) {
    setChecking(source.code);
    setMessage("");
    setResultType("");

    try {
      const response = await fetch(
        "/api/admin/sources/check",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: source.code,
          }),
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Source check failed (${response.status})`
        );
      }

      setResultType("success");

      setMessage(
        `${source.name} source check completed successfully.`
      );
    } catch (error) {
      setResultType("error");

      setMessage(
        error instanceof Error
          ? error.message
          : "Source check failed."
      );
    } finally {
      setChecking(null);
    }
  }

  async function checkAllSources() {
    setChecking("ALL");
    setMessage("");
    setResultType("");

    let successCount = 0;
    let failedCount = 0;

    for (const source of sources) {
      try {
        const response = await fetch(
          "/api/admin/sources/check",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              source: source.code,
            }),
          }
        );

        if (response.ok) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    setChecking(null);

    if (failedCount === 0) {
      setResultType("success");
      setMessage(
        `All ${successCount} sources checked successfully.`
      );
    } else {
      setResultType("error");
      setMessage(
        `${successCount} sources completed and ${failedCount} sources failed.`
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-blue-600">
            Automation
          </p>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Source Monitoring
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Monitor official recruitment, examination and education
            sources and send discovered content into the CareerPortal
            import workflow.
          </p>
        </div>

        <button
          type="button"
          onClick={checkAllSources}
          disabled={checking !== null}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {checking === "ALL"
            ? "Checking All Sources..."
            : "Check All Sources"}
        </button>
      </div>

      {/* Result message */}
      {message ? (
        <div
          className={`rounded-2xl border p-4 text-sm font-semibold ${
            resultType === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      {/* Overview */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Configured Sources"
          value={sources.length}
          icon="🌐"
        />

        <StatCard
          label="Monitoring System"
          value="Ready"
          icon="✓"
        />

        <StatCard
          label="Import Workflow"
          value="Active"
          icon="📥"
        />
      </div>

      {/* Source list */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
          <h2 className="text-base font-extrabold text-slate-900">
            Monitored Sources
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Official source integrations configured for CareerPortal.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {sources.map((source) => {
            const isChecking =
              checking === source.code ||
              checking === "ALL";

            return (
              <div
                key={source.code}
                className="p-5 transition hover:bg-slate-50 sm:p-6"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-extrabold text-blue-700">
                      {source.code.slice(0, 2)}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900 sm:text-base">
                          {source.name}
                        </h3>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          {source.code}
                        </span>
                      </div>

                      <p className="mt-1 text-xs font-semibold text-blue-600">
                        {source.type}
                      </p>

                      <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                        {source.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <div className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-[10px] font-extrabold text-emerald-700 sm:flex">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      READY
                    </div>

                    <button
                      type="button"
                      onClick={() => checkSource(source)}
                      disabled={checking !== null}
                      className="inline-flex min-w-[110px] items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-extrabold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isChecking
                        ? "Checking..."
                        : "Check Source"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* History links */}
      <div className="grid gap-4 md:grid-cols-2">
        <LinkCard
          href="/admin/sources/history"
          icon="📊"
          title="Monitoring History"
          description="View previous monitoring runs, statuses and discovered records."
        />

        <LinkCard
          href="/admin/import-queue"
          icon="📥"
          title="Import Queue"
          description="Review discovered source content before publishing it to the website."
        />
      </div>

      {/* Notice */}
      <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm">
            ℹ️
          </div>

          <div>
            <h2 className="text-sm font-extrabold text-blue-900">
              Important
            </h2>

            <p className="mt-1 text-xs leading-5 text-blue-800/80">
              Source monitoring should use official source data only.
              Discovered content must be reviewed through the Import
              Queue before it becomes public CareerPortal content.
            </p>
          </div>
        </div>
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
  value: string | number;
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

function LinkCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg">
          {icon}
        </div>

        <div>
          <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>
    </a>
  );
}