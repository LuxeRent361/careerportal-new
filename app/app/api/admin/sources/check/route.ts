import { NextResponse } from "next/server";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";
import { adminDb, runOfficialNoticeMonitor } from "@/lib/automation/official-notice-monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Administrator access required." }, { status: 403 });

    let body: { source?: string; sourceCode?: string } = {};
    try { body = await request.json(); } catch { /* empty body means scan every active source */ }
    const sourceCode = String(body.source || body.sourceCode || "").trim().toUpperCase();
    const result = await runOfficialNoticeMonitor(adminDb(), sourceCode || undefined);
    return NextResponse.json({ ...result, message: `${result.created} नया आधिकारिक नोटिस Import Queue में जोड़ा गया। ${result.duplicates} duplicate छोड़े गए। कोई भी नोटिस अपने-आप publish नहीं हुआ।`, publication: "manual-review-required" });
  } catch (error) {
    console.error("Official notice monitor failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Official notice monitor failed." }, { status: 500 });
  }
}
