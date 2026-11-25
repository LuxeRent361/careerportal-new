
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const [runsResult, sourcesResult] = await Promise.all([
      supabase.from("cp_import_runs").select("*").limit(200),
      supabase
        .from("cp_sources")
        .select("id,source_name,institution_name,official_url"),
    ]);

    if (runsResult.error) {
      return NextResponse.json(
        { error: runsResult.error.message },
        { status: 500 }
      );
    }

    if (sourcesResult.error) {
      return NextResponse.json(
        { error: sourcesResult.error.message },
        { status: 500 }
      );
    }

    const sources = sourcesResult.data ?? [];
    const sourceMap = new Map(
      sources.map((source) => [String(source.id), source])
    );

    const runs = (runsResult.data ?? [])
      .map((run) => {
        const source = sourceMap.get(String(run.source_id ?? ""));
        return {
          ...run,
          source_name:
            source?.institution_name ||
            source?.source_name ||
            "Unknown source",
          source_url: source?.official_url ?? null,
        };
      })
      .sort((a, b) => {
        const dateA = Date.parse(
          String(a.created_at ?? a.started_at ?? a.createdAt ?? "")
        ) || 0;
        const dateB = Date.parse(
          String(b.created_at ?? b.started_at ?? b.createdAt ?? "")
        ) || 0;
        return dateB - dateA;
      });

    return NextResponse.json({ success: true, runs });
  } catch (error) {
    console.error("Import history error:", error);
    return NextResponse.json(
      { error: "Could not load monitoring history" },
      { status: 500 }
    );
  }
}
