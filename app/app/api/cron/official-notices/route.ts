import { NextResponse } from "next/server";
import { adminDb, runOfficialNoticeMonitor } from "@/lib/automation/official-notice-monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ success: false, error: "CRON_SECRET is not configured." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  try {
    const result = await runOfficialNoticeMonitor(adminDb());
    return NextResponse.json({ ...result, publication: "manual-review-required" });
  } catch (error) {
    console.error("Scheduled official notice monitor failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Scheduled monitor failed." }, { status: 500 });
  }
}
