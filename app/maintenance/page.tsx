export const dynamic = "force-dynamic";

export default function MaintenancePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
          🛠️
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          WEBSITE MAINTENANCE
        </div>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          We’ll be back soon
        </h1>

        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">
          CareerPortal is currently being updated. We are working to improve
          the website and will be back shortly.
        </p>

        <div className="mt-8 rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-600">
          Please check back again soon.
        </div>

        <p className="mt-6 text-xs text-slate-400">
          CareerPortal • Jobs • Exams • Results • Education
        </p>
      </section>
    </main>
  );
}