
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getCurrentAdmin,
  getCurrentUser,
} from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceConfig = {
  code: string;
  name: string;
  url: string;
};

type Candidate = {
  title: string;
  url: string;
  contentType: string;
  metadata?: Record<string, unknown>;
};

type CheckResult = {
  success: boolean;
  statusCode: number | null;
  statusText: string;
  responseTime: number;
  finalUrl: string;
  candidates: Candidate[];
};

const SOURCES: Record<string, SourceConfig> = {
  SSC: {
    code: "SSC",
    name: "Staff Selection Commission",
    url: "https://ssc.gov.in/",
  },
  UPSC: {
    code: "UPSC",
    name: "Union Public Service Commission",
    url: "https://upsc.gov.in/",
  },
  RRB: {
    code: "RRB",
    name: "Railway Recruitment Board",
    url: "https://www.rrbcdg.gov.in/",
  },
  SBI: {
    code: "SBI",
    name: "State Bank of India",
    url: "https://sbi.co.in/web/careers",
  },
  AICTE: {
    code: "AICTE",
    name: "All India Council for Technical Education",
    url: "https://www.aicte-india.org/",
  },
  LIC: {
    code: "LIC",
    name: "Life Insurance Corporation of India",
    url: "https://licindia.in/careers",
  },
};

const REQUEST_TIMEOUT = 20000;
const MAX_CANDIDATES = 50;

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase URL or service role key is missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function cleanText(value: string): string {
  return value
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyContent(title: string): string {
  const value = title.toLowerCase();

  if (
    /result|merit list|score card|declaration of final result/.test(
      value
    )
  ) {
    return "result";
  }

  if (/admit card|hall ticket/.test(value)) {
    return "admit-card";
  }

  if (/answer key|response sheet|marks of cbe/.test(value)) {
    return "answer-key";
  }

  if (/syllabus/.test(value)) {
    return "syllabus";
  }

  if (
    /exam date|examination schedule|schedule of examinations/.test(
      value
    )
  ) {
    return "exam";
  }

  if (
    /recruitment|vacanc|apply online|application form|notification|advertisement|career opportunity|job opening/.test(
      value
    )
  ) {
    return "job";
  }

  return "notification";
}

function isRelevant(title: string): boolean {
  return /recruitment|vacanc|apply online|application form|notification|advertisement|career opportunity|job opening|result|merit list|score card|admit card|hall ticket|answer key|response sheet|syllabus|exam date|examination schedule|schedule of examinations|marks of cbe|cancellation notice|tentative vacancies/i.test(
    title
  );
}

function isAllowedOfficialLink(
  candidateUrl: URL,
  sourceUrl: URL
): boolean {
  if (candidateUrl.protocol !== "https:") {
    return false;
  }

  const host = candidateUrl.hostname.toLowerCase();
  const sourceHost = sourceUrl.hostname.toLowerCase();

  if (host === sourceHost || host.endsWith(`.${sourceHost}`)) {
    return true;
  }

  const officialDomains = [
    "gov.in",
    "nic.in",
    "ssc.nic.in",
    "sbi.co.in",
    "licindia.in",
    "aicte-india.org",
    "rrbcdg.gov.in",
    "upsc.gov.in",
  ];

  return officialDomains.some(
    (domain) =>
      host === domain || host.endsWith(`.${domain}`)
  );
}

/**
 * SSC's notices come from its JSON API, not just its homepage HTML.
 */
async function checkSscApi(
  source: SourceConfig
): Promise<CheckResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  const apiUrl = new URL(
    "/api/general-website/portal/notice-boards",
    source.url
  );

  apiUrl.searchParams.set("page", "1");
  apiUrl.searchParams.set("limit", String(MAX_CANDIDATES));
  apiUrl.searchParams.set("contentType", "notice-boards");
  apiUrl.searchParams.set("key", "createdAt");
  apiUrl.searchParams.set("order", "DESC");
  apiUrl.searchParams.set("isAttachment", "true");
  apiUrl.searchParams.set("language", "english");
  apiUrl.searchParams.set(
    "attributes",
    "id,headline,examId,contentType,redirectUrl,startDate,endDate,language,createdAt"
  );

  try {
    const response = await fetch(apiUrl.toString(), {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent":
          "CareerPortalBot/1.0 (+https://careerportal.space/)",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        statusText: `SSC API returned HTTP ${response.status}`,
        responseTime: Date.now() - started,
        finalUrl: response.url || apiUrl.toString(),
        candidates: [],
      };
    }

    let json: {
      statusCode?: string | number;
      statusMessage?: string;
      data?: Array<{
        id?: string;
        headline?: string;
        examId?: string;
        contentType?: string;
        redirectUrl?: string;
        startDate?: string | null;
        endDate?: string | null;
        language?: string;
        createdAt?: string;
        attachments?: Array<{
          id?: string;
          fileName?: string;
          type?: string;
          path?: string;
          size?: number;
        }>;
      }>;
      paginate?: {
        totalRecords?: number;
        currentPage?: number;
        totalPage?: number;
      };
    };

    try {
      json = await response.json();
    } catch {
      throw new Error("SSC API returned invalid JSON.");
    }

    if (!Array.isArray(json.data)) {
      throw new Error(
        "SSC API response did not contain a data array."
      );
    }

    const candidates: Candidate[] = [];
    const seen = new Set<string>();

    for (const notice of json.data) {
      if (candidates.length >= MAX_CANDIDATES) {
        break;
      }

      const title = cleanText(notice.headline || "");

      if (!notice.id || title.length < 5) {
        continue;
      }

      const attachments = Array.isArray(notice.attachments)
        ? notice.attachments
        : [];

      const firstAttachment = attachments.find(
        (attachment) =>
          typeof attachment.path === "string" &&
          attachment.path.trim().length > 0
      );

      /*
       * Prefer the official PDF attachment.
       * If the API provides a redirect URL, use it as a fallback.
       * Never fabricate a PDF filename.
       */
      let officialUrl = "";

      if (firstAttachment?.path) {
        const path = firstAttachment.path
          .trim()
          .replace(/\\/g, "/")
          .replace(/^\/+/, "");

        if (/^https:\/\//i.test(path)) {
          officialUrl = path;
        } else {
          officialUrl = new URL(
            path,
            "https://ssc.gov.in/"
          ).toString();
        }
      } else if (notice.redirectUrl?.trim()) {
        try {
          const redirect = new URL(
            notice.redirectUrl,
            source.url
          );

          if (
            isAllowedOfficialLink(
              redirect,
              new URL(source.url)
            )
          ) {
            officialUrl = redirect.toString();
          }
        } catch {
          // Skip an invalid redirect URL.
        }
      }

      if (!officialUrl) {
        // Without an official document or redirect, don't invent a link.
        continue;
      }

      let parsedUrl: URL;

      try {
        parsedUrl = new URL(officialUrl);
      } catch {
        continue;
      }

      if (
        !isAllowedOfficialLink(
          parsedUrl,
          new URL(source.url)
        )
      ) {
        continue;
      }

      if (seen.has(officialUrl)) {
        continue;
      }

      seen.add(officialUrl);

      candidates.push({
        title,
        url: officialUrl,
        contentType: classifyContent(title),
        metadata: {
          discovery_method: "ssc_official_json_api",
          notice_id: notice.id,
          exam_id: notice.examId || null,
          notice_content_type: notice.contentType || null,
          redirect_url: notice.redirectUrl || null,
          start_date: notice.startDate || null,
          end_date: notice.endDate || null,
          language: notice.language || "english",
          official_created_at: notice.createdAt || null,
          official_api_url: apiUrl.toString(),
          attachment_count: attachments.length,
          attachments: attachments.map((attachment) => ({
            id: attachment.id || null,
            file_name: attachment.fileName || null,
            type: attachment.type || null,
            path: attachment.path || null,
            size: attachment.size ?? null,
          })),
          review_required: true,
        },
      });
    }

    return {
      success: true,
      statusCode: response.status,
      statusText:
        json.statusMessage || "SSC API request successful",
      responseTime: Date.now() - started,
      finalUrl: response.url || apiUrl.toString(),
      candidates,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: null,
      statusText:
        error instanceof Error
          ? error.name === "AbortError"
            ? "SSC API request timed out"
            : error.message
          : "SSC API request failed",
      responseTime: Date.now() - started,
      finalUrl: apiUrl.toString(),
      candidates: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Non-SSC sources retain the previous HTML-based checker.
 */
function extractHtmlCandidates(
  html: string,
  source: SourceConfig,
  finalUrl: string
): Candidate[] {
  const candidates: Candidate[] = [];
  const seen = new Set<string>();
  const baseUrl = new URL(finalUrl);
  const sourceUrl = new URL(source.url);

  const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi;
  let rowMatch: RegExpExecArray | null;

  while (
    (rowMatch = rowPattern.exec(html)) !== null &&
    candidates.length < MAX_CANDIDATES
  ) {
    const rowHtml = rowMatch[1] || "";
    const rowText = cleanText(rowHtml);

    if (!isRelevant(rowText)) {
      continue;
    }

    const title = rowText
      .replace(/\bPDF\b|\bPOF\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (title.length < 8 || title.length > 500) {
      continue;
    }

    const anchorPattern =
      /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi;

    let anchorMatch: RegExpExecArray | null;

    while ((anchorMatch = anchorPattern.exec(rowHtml)) !== null) {
      const rawHref = anchorMatch[1]?.trim();

      if (
        !rawHref ||
        rawHref.startsWith("#") ||
        /^javascript:/i.test(rawHref)
      ) {
        continue;
      }

      try {
        const url = new URL(rawHref, baseUrl);

        if (!isAllowedOfficialLink(url, sourceUrl)) {
          continue;
        }

        url.hash = "";

        if (seen.has(url.href)) {
          continue;
        }

        seen.add(url.href);

        candidates.push({
          title,
          url: url.href,
          contentType: classifyContent(title),
          metadata: {
            discovery_method: "official_page_html",
            review_required: true,
          },
        });

        if (candidates.length >= MAX_CANDIDATES) {
          break;
        }
      } catch {
        // Ignore malformed links.
      }
    }
  }

  if (candidates.length === 0) {
    const anchorPattern =
      /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi;

    let anchorMatch: RegExpExecArray | null;

    while (
      (anchorMatch = anchorPattern.exec(html)) !== null &&
      candidates.length < MAX_CANDIDATES
    ) {
      const rawHref = anchorMatch[1]?.trim();
      const title = cleanText(anchorMatch[2] || "");

      if (
        !rawHref ||
        title.length < 8 ||
        title.length > 500 ||
        !isRelevant(title)
      ) {
        continue;
      }

      try {
        const url = new URL(rawHref, baseUrl);

        if (!isAllowedOfficialLink(url, sourceUrl)) {
          continue;
        }

        url.hash = "";

        if (seen.has(url.href)) {
          continue;
        }

        seen.add(url.href);

        candidates.push({
          title,
          url: url.href,
          contentType: classifyContent(title),
          metadata: {
            discovery_method: "official_page_html",
            review_required: true,
          },
        });
      } catch {
        // Ignore malformed links.
      }
    }
  }

  return candidates;
}

async function checkHtmlSource(
  source: SourceConfig
): Promise<CheckResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    const response = await fetch(source.url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        "User-Agent":
          "CareerPortalBot/1.0 (+https://careerportal.space/)",
      },
    });

    const finalUrl = response.url || source.url;

    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        statusText: response.statusText || "HTTP error",
        responseTime: Date.now() - started,
        finalUrl,
        candidates: [],
      };
    }

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("html")) {
      return {
        success: false,
        statusCode: response.status,
        statusText: "The source did not return an HTML page.",
        responseTime: Date.now() - started,
        finalUrl,
        candidates: [],
      };
    }

    const html = await response.text();

    return {
      success: true,
      statusCode: response.status,
      statusText: response.statusText || "HTTP response received",
      responseTime: Date.now() - started,
      finalUrl,
      candidates: extractHtmlCandidates(
        html,
        source,
        finalUrl
      ),
    };
  } catch (error) {
    return {
      success: false,
      statusCode: null,
      statusText:
        error instanceof Error
          ? error.name === "AbortError"
            ? "Request timed out"
            : error.message
          : "Source request failed",
      responseTime: Date.now() - started,
      finalUrl: source.url,
      candidates: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkOfficialSource(
  source: SourceConfig
): Promise<CheckResult> {
  if (source.code === "SSC") {
    return checkSscApi(source);
  }

  return checkHtmlSource(source);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Authentication required.",
        },
        { status: 401 }
      );
    }

    const admin = await getCurrentAdmin();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          error: "Administrator access required.",
        },
        { status: 403 }
      );
    }

    let body: { source?: string };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON request.",
        },
        { status: 400 }
      );
    }

    const sourceCode = String(body.source || "")
      .trim()
      .toUpperCase();

    const source = SOURCES[sourceCode];

    if (!source) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported source: ${sourceCode || "(empty)"}`,
        },
        { status: 400 }
      );
    }

    const startedAt = new Date().toISOString();
    const result = await checkOfficialSource(source);
    const supabase = createAdminClient();

    let created = 0;
    let skippedDuplicates = 0;
    let queueError: string | null = null;

    if (result.success && result.candidates.length > 0) {
      const { data: existingRows, error: lookupError } =
        await supabase
          .from("content_import_queue")
          .select("source_url")
          .eq("source_code", source.code)
          .limit(5000);

      if (lookupError) {
        queueError = `Queue lookup failed: ${lookupError.message}`;
      } else {
        const existingUrls = new Set(
          (existingRows || [])
            .map((row) => row.source_url)
            .filter(
              (value): value is string =>
                typeof value === "string" && value.length > 0
            )
        );

        const newCandidates = result.candidates.filter(
          (candidate) => {
            if (existingUrls.has(candidate.url)) {
              skippedDuplicates++;
              return false;
            }

            existingUrls.add(candidate.url);
            return true;
          }
        );

        if (newCandidates.length > 0) {
          const queueRows = newCandidates.map((candidate) => ({
            source_id: source.code,
            source_code: source.code,
            source_name: source.name,
            source_url: candidate.url,
            source_title: candidate.title,
            title: candidate.title,
            content_type: candidate.contentType,
            item_type: candidate.contentType,
            status: "pending",
            content_data: {
              title: candidate.title,
              official_url: candidate.url,
              source_homepage: source.url,
              source_code: source.code,
              discovered_at: new Date().toISOString(),
              review_required: true,
              ...(candidate.metadata || {}),
            },
            raw_content: {
              title: candidate.title,
              url: candidate.url,
              ...(candidate.metadata || {}),
            },
            normalized_content: {
              title: candidate.title,
              official_url: candidate.url,
              content_type: candidate.contentType,
              ...(candidate.metadata || {}),
            },
            payload: {
              title: candidate.title,
              url: candidate.url,
              content_type: candidate.contentType,
              ...(candidate.metadata || {}),
            },
            metadata: {
              source_code: source.code,
              source_name: source.name,
              source_homepage: source.url,
              review_required: true,
              ...(candidate.metadata || {}),
            },
          }));

          const { data: insertedRows, error: insertError } =
            await supabase
              .from("content_import_queue")
              .insert(queueRows)
              .select("id");

          if (insertError) {
            queueError = `Queue insert failed: ${insertError.message}`;
          } else {
            created = insertedRows?.length ?? queueRows.length;
          }
        }
      }
    }

    const runStatus =
      result.success && !queueError ? "success" : "failed";

    const errorMessage = [
      result.success
        ? null
        : `HTTP ${result.statusCode ?? "N/A"}: ${result.statusText}`,
      queueError,
    ]
      .filter(Boolean)
      .join(" | ") || null;

    const { error: historyError } = await supabase
      .from("source_import_runs")
      .insert({
        status: runStatus,
        source_code: source.code,
        source_name: source.name,
        found: result.candidates.length,
        created,
        failed: runStatus === "failed" ? 1 : 0,
        started_at: startedAt,
        error_message: errorMessage,
      });

    if (historyError) {
      console.error(
        "Monitoring history insert failed:",
        historyError
      );
    }

    try {
      await supabase.from("activity_logs").insert({
        actor_user_id: user.id,
        actor_email: user.email,
        action: "source_check",
        entity_type: "source",
        entity_id: source.code,
        description: `${source.name} source check: ${runStatus}`,
        metadata: {
          source_code: source.code,
          source_url: source.url,
          status_code: result.statusCode,
          response_time: result.responseTime,
          found: result.candidates.length,
          created,
          skipped_duplicates: skippedDuplicates,
        },
      });
    } catch (logError) {
      console.error("Optional activity log failed:", logError);
    }

    const message = !result.success
      ? `${source.name} check failed: ${result.statusText}`
      : queueError
        ? queueError
        : created > 0
          ? `${created} official notice candidate(s) added to Import Queue. Review before publishing.`
          : result.candidates.length === 0
            ? "The source responded, but no usable official document links were found."
            : "No new links added. Matching links may already be in the queue.";

    return NextResponse.json({
      success: runStatus === "success",
      source: {
        code: source.code,
        name: source.name,
        url: source.url,
      },
      status: runStatus,
      found: result.candidates.length,
      created,
      skippedDuplicates,
      failed: runStatus === "failed" ? 1 : 0,
      statusCode: result.statusCode,
      statusText: result.statusText,
      responseTime: result.responseTime,
      finalUrl: result.finalUrl,
      error: errorMessage,
      message,
    });
  } catch (error) {
    console.error("Source check error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unexpected source check error.",
      },
      { status: 500 }
    );
  }
}