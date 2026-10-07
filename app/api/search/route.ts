import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim();

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    if (query.length < 2) {
      return NextResponse.json({
        results: [],
        message: "Search term must contain at least 2 characters.",
      });
    }

    const supabase = await createClient();

    const search = `%${query.replace(/[%_]/g, "\\$&")}%`;

    const results: Array<{
      id: string;
      title: string;
      organization?: string | null;
      category?: string | null;
      type: "job" | "exam" | "result" | "education";
      url: string;
      description?: string | null;
    }> = [];

    const [jobsResponse, examsResponse, resultsResponse, educationResponse] =
      await Promise.all([
        supabase
          .from("jobs")
          .select("id,title,organization,category,type,description")
          .eq("is_published", true)
          .or(
            `title.ilike.${search},organization.ilike.${search},category.ilike.${search}`
          )
          .limit(15),

        supabase
          .from("exams")
          .select(
            "id,title,name,organization,category,description"
          )
          .eq("is_published", true)
          .or(
            `title.ilike.${search},name.ilike.${search},organization.ilike.${search},category.ilike.${search}`
          )
          .limit(15),

        supabase
          .from("results")
          .select("id,title,organization,category,description")
          .eq("is_published", true)
          .or(
            `title.ilike.${search},organization.ilike.${search},category.ilike.${search}`
          )
          .limit(15),

        supabase
          .from("education")
          .select(
            "id,title,name,organization,institution,category,description"
          )
          .eq("is_published", true)
          .or(
            `title.ilike.${search},name.ilike.${search},organization.ilike.${search},institution.ilike.${search},category.ilike.${search}`
          )
          .limit(15),
      ]);

    for (const item of jobsResponse.data || []) {
      results.push({
        id: item.id,
        title: item.title || "Job Opportunity",
        organization: item.organization,
        category: item.category || item.type,
        type: "job",
        url: `/jobs/${item.id}`,
        description: item.description,
      });
    }

    for (const item of examsResponse.data || []) {
      results.push({
        id: item.id,
        title: item.title || item.name || "Examination",
        organization: item.organization,
        category: item.category,
        type: "exam",
        url: `/exam/${item.id}`,
        description: item.description,
      });
    }

    for (const item of resultsResponse.data || []) {
      results.push({
        id: item.id,
        title: item.title || "Examination Result",
        organization: item.organization,
        category: item.category,
        type: "result",
        url: `/results/${item.id}`,
        description: item.description,
      });
    }

    for (const item of educationResponse.data || []) {
      results.push({
        id: item.id,
        title: item.title || item.name || "Education Update",
        organization: item.organization || item.institution,
        category: item.category,
        type: "education",
        url: `/education/${item.id}`,
        description: item.description,
      });
    }

    return NextResponse.json({
      results,
      total: results.length,
    });
  } catch (error) {
    console.error("Search API error:", error);

    return NextResponse.json(
      {
        results: [],
        error: "Search temporarily unavailable.",
      },
      { status: 500 }
    );
  }
}