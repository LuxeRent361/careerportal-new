import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ContentType =
  | "job"
  | "exam"
  | "result"
  | "admit-card"
  | "answer-key"
  | "syllabus"
  | "notification";

type SourceConfig = {
  code: string;
  name: string;
  url: string;
  allowedHosts: string[];
};

type Candidate = {
  title: string;
  url: string;
  contentType: ContentType;
  metadata: Record<string, unknown>;
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
    allowedHosts: ["ssc.gov.in", "ssc.nic.in"],
  },
  UPSC: {
    code: "UPSC",
    name: "Union Public Service Commission",
    url: "https://upsc.gov.in/",
    allowedHosts: ["upsc.gov.in"],
  },
  RRB: {
    code: "RRB",
    name: "Railway Recruitment Board",
    url: "https://www.rrbcdg.gov.in/",
    allowedHosts: ["rrbcdg.gov.in"],
  },
  SBI: {
    code: "SBI",
    name: "State Bank of India",
    url: "https://sbi.co.in/web/careers",
    allowedHosts: ["sbi.co.in", "bank.sbi"],
  },
  AICTE: {
    code: "AICTE",
    name: "All India Council for Technical Education",
    url: "https://www.aicte-india.org/",
    allowedHosts: ["aicte-india.org", "aicte-india.org.in", "aicte.gov.in"],
  },
  LIC: {
    code: "LIC",
    name: "Life Insurance Corporation of India",
    url: "https://licindia.in/careers",
    allowedHosts: ["licindia.in"],
  },
};

const REQUEST_TIMEOUT_MS = 18000;
const MAX_CANDIDATES = 30;
const MAX_HTML_BYTES = 4_000_000;

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase URL or service role key is missing.");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n: string) => {
      const code = Number(n);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : " ";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => {
      const code = Number.parseInt(n, 16);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : " ";
    });
}

function cleanText(input: string): string {
  return decodeEntities(
    input
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTitle(input: string): string {
  return cleanText(input)
    .replace(/\b(?:PDF|DOWNLOAD|CLICK HERE|READ MORE|VIEW MORE)\b/gi, " ")
    .replace(/^[\s|:;,.–—-]+|[\s|:;,.–—-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const JUNK_TITLE_PATTERNS = [
  /^home(?:page)?$/i,
  /^about(?: us)?$/i,
  /^contact(?: us)?$/i,
  /^career opportunities?$/i,
  /^careers?$/i,
  /^latest (?:news|updates?)$/i,
  /^(?:view|see|read|click|download|know) (?:all|more|here|details|now)/i,
  /^overview\b/i,
  /^everything from\b/i,
  /^advertisements?\s*(?:see|view|browse|click|here|our complete list)/i,
  /^(?:notice board|important links|quick links|useful links|site map|sitemap)$/i,
  /^(?:notifications?|notices?|announcements?)$/i,
  /^(?:recruitment|results?|admit cards?|answer keys|syllabus)$/i,
  /^(?:official website|welcome|search|login|register|menu)$/i,
  /\b(?:privacy policy|terms and conditions|copyright|all rights reserved)\b/i,
];

const CATEGORY_RULES: Array<{ type: ContentType; pattern: RegExp }> = [
  {
    type: "result",
    pattern: /\b(result declared|results? announced|final result|written result|merit list|score ?card|marks list|marks of (?:the )?(?:cbe|exam)|selection list|selected candidates|shortlisted candidates|cut[- ]?off marks)\b/i,
  },
  {
    type: "admit-card",
    pattern: /\b(admit card|hall ticket|admission certificate|call letter for (?:the )?(?:exam|examination)|download e[- ]?call letter)\b/i,
  },
  {
    type: "answer-key",
    pattern: /\b(answer keys?|response sheets?|provisional key|final key|challenge (?:window|link) for answer)\b/i,
  },
  {
    type: "syllabus",
    pattern: /\b(syllabus|exam pattern|examination scheme|curriculum)\b/i,
  },
  {
    type: "exam",
    pattern: /\b(exam(?:ination)? (?:date|schedule|calendar|time table)|schedule of examinations|date sheet|revised exam date|exam postponed|examination postponed|rescheduled examination)\b/i,
  },
  {
    type: "job",
    pattern: /\b(recruitment|recruitment notification|notification for (?:the )?post|applications? invited|apply online|online application|vacanc(?:y|ies)|posts? advertised|engagement of|appointment to the post|direct recruitment|employment notice|advertisement no\.?|advt\.?\s*(?:no\.?|number)?\s*\d|apprentice recruitment|officer recruitment|assistant recruitment|constable recruitment|teacher recruitment|junior engineer recruitment|clerk recruitment)\b/i,
  },
  {
    type: "notification",
    pattern: /\b(corrigendum|extension of last date|last date extended|withdrawal of notification|cancellation of (?:exam|recruitment|notification)|revised date|document verification schedule|important notice regarding|notice regarding (?:exam|recruitment|result|admit card)|postponement of)\b/i,
  },
];

function classifyContent(title: string): ContentType | null {
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(title)) return rule.type;
  }
  return null;
}

function isJunkTitle(title: string): boolean {
  const value = title.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    !value ||
    value.length < 16 ||
    value.length > 420 ||
    JUNK_TITLE_PATTERNS.some((pattern) => pattern.test(value)) ||
    /^(?:overview|advertisements?|official notices?)\b/i.test(value) ||
    /\b(?:see our complete list|everything from advertisements|view syllabus for .* courses)\b/i.test(value)
  );
}

function getQualityScore(title: string, url: URL): number {
  let score = 0;
  if (classifyContent(title)) score += 3;
  if (/\b(202[5-9]|203\d)\b/.test(title)) score += 1;
  if (/\b(advt|advertisement|notification|notice|result|exam|recruitment)\b/i.test(title)) score += 1;
  if (/\.(?:pdf)(?:$|\?)/i.test(url.pathname + url.search)) score += 2;
  if (/\b(apply online|last date|vacanc(?:y|ies)|merit list|admit card|answer key|exam date)\b/i.test(title)) score += 1;
  return score;
}

function normalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_.+|fbclid|gclid|mc_cid|mc_eid)$/i.test(key)) {
      url.searchParams.delete(key);
    }
  }
  url.hostname = url.hostname.toLowerCase();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function isAllowedOfficialLink(candidate: URL, source: SourceConfig): boolean {
  if (
    candidate.protocol !== "https:" ||
    candidate.username ||
    candidate.password ||
    (candidate.port && candidate.port !== "443")
  ) {
    return false;
  }
  const host = candidate.hostname.toLowerCase().replace(/\.$/, "");
  return source.allowedHosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

function isAssetOrNavigationUrl(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  if (/\.(?:jpg|jpeg|png|gif|svg|webp|css|js|xml|zip|rar|docx?|xlsx?|pptx?)(?:$|\?)/i.test(path)) return true;
  if (/\/(?:about|contact|privacy|terms|sitemap|login|register|search|feedback|tender)(?:\/|$)/i.test(path)) return true;
  return false;
}

function extractCandidates(html: string, source: SourceConfig, finalUrl: string): Candidate[] {
  const baseUrl = new URL(finalUrl);
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  // Consider only links with their nearest table/list/card text. Do not turn the
  // whole homepage text into a notice title.
  const anchorPattern = /<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while ((match = anchorPattern.exec(html)) && candidates.length < MAX_CANDIDATES * 4) {
    const href = (match[2] || "").trim();
    const anchorText = normalizeTitle(match[4] || "");
    if (!href || !anchorText || /^#|^(?:javascript|mailto|tel):/i.test(href)) continue;

    let url: URL;
    try {
      url = new URL(href, baseUrl);
    } catch {
      continue;
    }
    if (!isAllowedOfficialLink(url, source) || isAssetOrNavigationUrl(url)) continue;

    const before = html.slice(Math.max(0, match.index - 1800), match.index);
    const after = html.slice(anchorPattern.lastIndex, Math.min(html.length, anchorPattern.lastIndex + 900));
    const nearestRow = before.lastIndexOf("<tr");
    const rowEnd = after.indexOf("</tr>");
    const rowText = nearestRow >= 0
      ? cleanText(before.slice(nearestRow) + match[0] + (rowEnd >= 0 ? after.slice(0, rowEnd) : ""))
      : "";
    const nearestList = Math.max(before.lastIndexOf("<li"), before.lastIndexOf("<article"), before.lastIndexOf("class=\"views-row"), before.lastIndexOf("class='views-row"));
    const cardText = nearestList >= 0
      ? cleanText(before.slice(nearestList) + match[0] + after.slice(0, Math.min(700, after.length)))
      : "";
    const title = normalizeTitle(rowText.length >= anchorText.length + 8 ? rowText : cardText.length >= anchorText.length + 8 ? cardText : anchorText);
    if (isJunkTitle(title)) continue;

    const contentType = classifyContent(title);
    if (!contentType) continue;

    const normalizedUrl = normalizeUrl(url.toString());
    if (seen.has(normalizedUrl)) continue;

    const score = getQualityScore(title, url);
    // Require a concrete notice signal; generic page labels are never enough.
    if (score < 4) continue;
    if (title.length > 420) continue;

    seen.add(normalizedUrl);
    candidates.push({
      title,
      url: normalizedUrl,
      contentType,
      metadata: {
        discovery_method: "official_html_link",
        quality_score: score,
        official_source: source.name,
        source_homepage: source.url,
        review_required: true,
        auto_published: false,
      },
    });
  }

  return candidates
    .sort((a, b) => Number(b.metadata.quality_score) - Number(a.metadata.quality_score))
    .slice(0, MAX_CANDIDATES);
}

async function checkOfficialSource(source: SourceConfig): Promise<CheckResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
        "User-Agent": "CareerPortalBot/2.0 (+https://careerportal.space/)",
      },
    });
    const finalUrl = response.url || source.url;
    if (!response.ok) {
      return {
        success: false,
        statusCode: response.status,
        statusText: `Official source returned HTTP ${response.status}`,
        responseTime: Date.now() - started,
        finalUrl,
        candidates: [],
      };
    }

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    if (!contentType.includes("html") && !contentType.includes("text")) {
      return {
        success: false,
        statusCode: response.status,
        statusText: `Unsupported source content type: ${contentType || "unknown"}`,
        responseTime: Date.now() - started,
        finalUrl,
        candidates: [],
      };
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("Official source returned an empty response body.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;
        total += value.byteLength;
        if (total > MAX_HTML_BYTES) {
          await reader.cancel();
          throw new Error("Source page exceeded the 4 MB safety limit.");
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const html = new TextDecoder("utf-8").decode(bytes);
    const finalSourceUrl = new URL(finalUrl);
    if (!isAllowedOfficialLink(finalSourceUrl, source)) {
      throw new Error("Official source redirected to an unapproved domain; import blocked.");
    }
    const candidates = extractCandidates(html, source, finalUrl);
    return {
      success: true,
      statusCode: response.status,
      statusText: candidates.length
        ? `Official page checked; ${candidates.length} high-relevance candidate(s) found.`
        : "Official page checked; no sufficiently specific notice links found. Nothing imported.",
      responseTime: Date.now() - started,
      finalUrl,
      candidates,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: null,
      statusText:
        error instanceof Error
          ? error.name === "AbortError"
            ? "Official source request timed out."
            : error.message
          : "Official source request failed.",
      responseTime: Date.now() - started,
      finalUrl: source.url,
      candidates: [],
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Administrator access required." }, { status: 403 });
    }

    
let body: { source?: string; sourceId?: string };

try {
  body = await request.json();
} catch {
  return NextResponse.json(
    { success: false, error: "Invalid JSON request." },
    { status: 400 },
  );
}

const supabase = createAdminClient();

let sourceCode = String(body.source || "").trim().toUpperCase();

if (body.sourceId) {
  const { data: savedSource, error: savedSourceError } = await supabase
    .from("content_sources")
    .select("id, name, code, website_url, is_active")
    .eq("id", body.sourceId)
    .maybeSingle();

  if (savedSourceError) {
    return NextResponse.json(
      { success: false, error: `Could not load source: ${savedSourceError.message}` },
      { status: 500 },
    );
  }

  if (!savedSource) {
    return NextResponse.json(
      { success: false, error: "Selected source was not found in content_sources." },
      { status: 404 },
    );
  }

  if (savedSource.is_active === false) {
    return NextResponse.json(
      { success: false, error: "This source is disabled. Enable it before checking." },
      { status: 400 },
    );
  }

  sourceCode = String(savedSource.code || "").trim().toUpperCase();
}

const source = SOURCES[sourceCode];

if (!source) {
  return NextResponse.json(
    {
      success: false,
      error: `Unsupported source code: ${sourceCode || "(empty)"}. Configure its official source before checking.`,
    },
    { status: 400 },
  );
}


    const startedAt = new Date().toISOString();
    const result = await checkOfficialSource(source);
    let created = 0;
    let skippedDuplicates = 0;
    let queueError: string | null = null;

    if (result.success && result.candidates.length > 0) {
      const { data: existingRows, error: lookupError } = await supabase
        .from("content_import_queue")
        .select("source_url")
        .eq("source_code", source.code)
        .limit(10000);

      if (lookupError) {
        queueError = `Queue lookup failed: ${lookupError.message}`;
      } else {
        const existingUrls = new Set(
          (existingRows || [])
            .map((row) => row.source_url)
            .filter((value): value is string => typeof value === "string" && value.length > 0)
            .map((value) => {
              try { return normalizeUrl(value); } catch { return value.trim(); }
            }),
        );

        const newCandidates = result.candidates.filter((candidate) => {
          const key = normalizeUrl(candidate.url);
          if (existingUrls.has(key)) {
            skippedDuplicates++;
            return false;
          }
          existingUrls.add(key);
          return true;
        });

        if (newCandidates.length) {
          const rows = newCandidates.map((candidate) => ({
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
              auto_published: false,
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
              auto_published: false,
              ...(candidate.metadata || {}),
            },
          }));

          const { data: inserted, error: insertError } = await supabase
            .from("content_import_queue")
            .insert(rows)
            .select("id");

          if (insertError) queueError = `Queue insert failed: ${insertError.message}`;
          else created = inserted?.length ?? rows.length;
        }
      }
    }

    const runStatus = result.success && !queueError ? "success" : "failed";
    const errorMessage = [
      result.success ? null : `HTTP ${result.statusCode ?? "N/A"}: ${result.statusText}`,
      queueError,
    ].filter(Boolean).join(" | ") || null;

    const { error: historyError } = await supabase.from("source_import_runs").insert({
      status: runStatus,
      source_code: source.code,
      source_name: source.name,
      found: result.candidates.length,
      created,
      failed: runStatus === "failed" ? 1 : 0,
      started_at: startedAt,
      error_message: errorMessage,
    });
    if (historyError) console.error("Monitoring history insert failed:", historyError);

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
    } catch (error) {
      console.error("Optional activity log failed:", error);
    }

    const message = !result.success
      ? `${source.name} check failed: ${result.statusText}`
      : queueError
        ? queueError
        : created
          ? `${created} high-relevance official notice(s) added to Import Queue. They remain pending review; nothing was published automatically.`
          : result.candidates.length === 0
            ? "Source checked successfully, but no sufficiently specific notice links were found. Nothing was imported."
            : "No new notices added. All matching links may already be in the queue.";

    return NextResponse.json({
      success: runStatus === "success",
      source: { code: source.code, name: source.name, url: source.url },
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
        error: error instanceof Error ? error.message : "Unexpected source check error.",
      },
      { status: 500 },
    );
  }
}
