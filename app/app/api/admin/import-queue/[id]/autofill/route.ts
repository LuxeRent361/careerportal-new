import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Data = Record<string, unknown>;

function asObject(value: unknown): Data {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Data;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Data;
    } catch {}
  }
  return {};
}

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_match, number: string) => String.fromCodePoint(Number(number)))
    .replace(/&#x([\da-f]+);/gi, (_match, number: string) => String.fromCodePoint(parseInt(number, 16)));
}

function htmlToText(html: string): string {
  return decodeHtml(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(?:p|div|li|tr|h[1-6]|section|article|br)>/gi, "\n")
      .replace(/<\/(?:td|th)>/gi, " | ")
      .replace(/<[^>]+>/g, " ")
  ).replace(/[\t\r ]+/g, " ").replace(/\n\s*/g, "\n").trim();
}

function firstMatch(source: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = source.match(pattern);
    const value = match?.[1]?.trim().replace(/\s+/g, " ");
    if (value) return value.replace(/[.;,\s]+$/, "");
  }
  return "";
}

function labelValue(source: string, labels: string[]): string {
  const escaped = labels.map(label => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return firstMatch(source, [
    new RegExp(`(?:^|\\n|\\b)(?:${escaped})\\s*(?:[:：-]|\\s{1,3})\\s*([^\\n]{2,220})`, "i"),
    new RegExp(`(?:^|\\n|\\b)(?:${escaped})\\s*\\n\\s*([^\\n]{2,220})`, "i"),
  ]);
}

function normalizeDate(raw: string): string {
  const value = raw.trim();
  const m = value.match(/\b(\d{1,2})[\/.\- ](\d{1,2})[\/.\- ](\d{4})\b/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  return iso ? iso[0] : value;
}

function collectExisting(item: Data): Data {
  return {
    ...asObject(item.raw_content),
    ...asObject(item.metadata),
    ...asObject(item.payload),
    ...asObject(item.normalized_content),
    ...asObject(item.content_data),
  };
}

function extractFields(sourceText: string, item: Data, sourceUrl: string): Data {
  const source = sourceText.slice(0, 180_000);
  const fields: Data = {};
  const existing = collectExisting(item);
  const set = (key: string, value: string) => { if (value && value.trim()) fields[key] = value.trim(); };

  set("title", text(item.title) || text(existing.title) || firstMatch(source, [/^\s*([^\n]{8,180})/m]));
  set("organization", labelValue(source, ["Organization", "Organisation", "Department", "Recruiting Organization", "Recruitment Board", "Name of the Department", "संस्था", "विभाग"]));
  set("post_name", labelValue(source, ["Post Name", "Name of Post", "Name of the Post", "Post", "पद का नाम"]));
  set("total_vacancies", labelValue(source, ["Total Vacancies", "Total Posts", "No. of Vacancies", "Number of Vacancies", "Vacancy Details", "कुल पद", "रिक्त पद"]));
  set("qualification", labelValue(source, ["Educational Qualification", "Essential Qualification", "Education Qualification", "Qualification", "Eligibility Criteria", "शैक्षणिक योग्यता", "योग्यता"]));
  set("age_limit", labelValue(source, ["Age Limit", "Age Criteria", "आयु सीमा"]));
  set("age_relaxation", labelValue(source, ["Age Relaxation", "Relaxation in Age", "आयु में छूट"]));
  set("salary", labelValue(source, ["Salary", "Pay Scale", "Pay Level", "Pay Matrix", "वेतनमान", "वेतन"]));
  set("application_fee", labelValue(source, ["Application Fee", "Examination Fee", "Exam Fee", " आवेदन शुल्क", "आवेदन फीस"]));
  set("application_start", normalizeDate(labelValue(source, ["Application Start Date", "Starting Date", "Start Date", "Online Application Starts", "Registration Starts", "आवेदन शुरू"] )));
  set("last_date", normalizeDate(labelValue(source, ["Last Date to Apply", "Last Date", "Closing Date", "Last Date for Submission", "आवेदन की अंतिम तिथि"] )));
  set("exam_date", normalizeDate(labelValue(source, ["Exam Date", "Date of Examination", "Examination Date", "परीक्षा तिथि"] )));
  set("result_date", normalizeDate(labelValue(source, ["Result Date", "Date of Result", "परिणाम तिथि"] )));
  set("admit_card_date", normalizeDate(labelValue(source, ["Admit Card Release Date", "Admit Card Date", "Hall Ticket Date", "प्रवेश पत्र"] )));
  set("publication_date", normalizeDate(labelValue(source, ["Notification Date", "Published Date", "Publication Date", "Date of Advertisement", "जारी तिथि"] )));
  set("selection_process", labelValue(source, ["Selection Process", "Mode of Selection", "चयन प्रक्रिया"]));
  set("how_to_apply", labelValue(source, ["How to Apply", "Application Process", "आवेदन कैसे करें"]));
  set("required_documents", labelValue(source, ["Required Documents", "Documents Required", "आवश्यक दस्तावेज"]));
  set("important_dates", labelValue(source, ["Important Dates", "Schedule", "महत्वपूर्ण तिथियां"]));
  set("description", source.slice(0, 12_000));
  set("source_url", sourceUrl);

  const urls = Array.from(source.matchAll(/https?:\/\/[^\s"'<>]+/gi)).map(m => m[0].replace(/[),.;]+$/, ""));
  const pdfUrl = urls.find(url => /\.pdf(?:\?|$)/i.test(url));
  if (pdfUrl) set("notification_url", pdfUrl);
  if (sourceUrl) set("official_website", new URL(sourceUrl).origin);
  if (/result|score.?card|merit list|marks uploaded/i.test(text(item.title))) fields.content_type = "result";
  else if (/admit card|hall ticket/i.test(text(item.title))) fields.content_type = "admit_card";
  else if (/answer key|objection/i.test(text(item.title))) fields.content_type = "answer_key";
  else if (/syllabus|exam pattern/i.test(text(item.title))) fields.content_type = "syllabus";
  else if (/recruitment|vacanc|apply online|post name|job/i.test(source.slice(0, 4000))) fields.content_type = "job";

  // Structured metadata commonly present on official pages can provide better values than regex matches.
  const structured = Object.values(existing).find(v => v && typeof v === "object" && !Array.isArray(v)) as Data | undefined;
  if (structured) {
    for (const [key, value] of Object.entries(structured)) if (!(key in fields) && (typeof value === "string" || typeof value === "number")) fields[key] = value;
  }
  return fields;
}

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "Login required." }, { status: 401 });
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });

    const { id } = await context.params;
    if (!id || id.length > 200) return NextResponse.json({ success: false, error: "Invalid queue item ID." }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) return NextResponse.json({ success: false, error: "Supabase environment variables are missing." }, { status: 500 });
    const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: item, error } = await supabase.from("content_import_queue").select("*").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    if (!item) return NextResponse.json({ success: false, error: "Queue item not found." }, { status: 404 });

    const existing = collectExisting(item as Data);
    const candidateUrls = [
      text(existing.notification_url), text(existing.document_url), text(existing.official_url),
      text(existing.pdf_url), text(existing.source_url), text((item as Data).source_url),
    ].filter(Boolean);
    const target = candidateUrls.find(candidate => /^https?:\/\//i.test(candidate));
    if (!target) return NextResponse.json({ success: false, error: "Is record mein fetch karne ke liye official source URL nahi mila." }, { status: 422 });

    let parsed: URL;
    try { parsed = new URL(target); } catch { return NextResponse.json({ success: false, error: "Source URL invalid hai." }, { status: 422 }); }
    if (!(["http:", "https:"].includes(parsed.protocol))) return NextResponse.json({ success: false, error: "Only HTTP/HTTPS source URLs are supported." }, { status: 422 });
    if (["localhost", "127.0.0.1", "0.0.0.0", "::1"].includes(parsed.hostname.toLowerCase())) return NextResponse.json({ success: false, error: "Localhost URL is not allowed." }, { status: 422 });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "CareerPortalNoticeReader/1.0 (+https://careerportal.space/)", Accept: "text/html,application/xhtml+xml,text/plain,application/pdf,*/*;q=0.8" },
        cache: "no-store",
      });
    } catch (caught) {
      const message = caught instanceof Error && caught.name === "AbortError" ? "Official source se response 15 seconds mein nahi mila (timeout)." : "Official source fetch nahi ho saka. Site ne request block ki ho sakti hai.";
      return NextResponse.json({ success: false, error: message }, { status: 502 });
    } finally { clearTimeout(timeout); }

    if (!response.ok) return NextResponse.json({ success: false, error: `Official source ne HTTP ${response.status} return kiya.` }, { status: 502 });
    const contentType = response.headers.get("content-type") || "";
    const isPdf = /application\/pdf/i.test(contentType) || /\.pdf(?:\?|$)/i.test((response.url || parsed.toString()).split("#")[0]);
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > 12_000_000) return NextResponse.json({ success: false, error: "Official document 12 MB limit se bada hai; safety ke liye download rok diya." }, { status: 413 });

    if (isPdf) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > 12_000_000) return NextResponse.json({ success: false, error: "Official PDF 12 MB limit se bada hai; safety ke liye process nahi kiya." }, { status: 413 });
      if (bytes.byteLength < 5 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
        return NextResponse.json({ success: false, error: "URL PDF jaisa lagta hai, lekin response valid PDF file nahi hai." }, { status: 422 });
      }
      let pdfText = "";
      let pdfPages = 0;
      try {
        const pdfModule = await import("pdf-parse");
        const PDFParse = pdfModule.PDFParse;
        const parser = new PDFParse({ data: bytes });
        try {
          const parsedPdf = await parser.getText();
          pdfText = typeof parsedPdf?.text === "string" ? parsedPdf.text : "";
          pdfPages = typeof parsedPdf?.total === "number" ? parsedPdf.total : Array.isArray(parsedPdf?.pages) ? parsedPdf.pages.length : 0;
        } finally {
          await parser.destroy();
        }
      } catch (pdfError) {
        return NextResponse.json({ success: false, error: `PDF text extraction fail hua: ${pdfError instanceof Error ? pdfError.message : "unknown parser error"}. Agar ye scanned/image PDF hai to OCR ki zaroorat hogi; fields guess nahi ki gayi.` }, { status: 422 });
      }
      if (pdfText.trim().length < 40) return NextResponse.json({ success: false, error: "PDF mein readable text nahi mila. Ye scanned/image PDF ho sakta hai; OCR configured nahi hai, isliye fields fabricate nahi ki gayi." }, { status: 422 });
      const finalUrl = response.url || parsed.toString();
      const fields = extractFields(pdfText, item as Data, finalUrl);
      return NextResponse.json({ success: true, fields, extractedCharacters: pdfText.length, extractionMethod: "official-pdf-text", pdfPages, sourceUrl: finalUrl });
    }

    const html = await response.text();
    if (!html.trim()) return NextResponse.json({ success: false, error: "Official source ne khaali response diya." }, { status: 422 });
    const sourceText = htmlToText(html);
    if (sourceText.length < 80) return NextResponse.json({ success: false, error: "Official page mein parhne layak notice text nahi mila." }, { status: 422 });
    const pageTitle = decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "").replace(/<[^>]+>/g, " ")).trim();
    if (/^(home|homepage|careers?|recruitment|advertisements?|notice board|latest news|official website)$/i.test(pageTitle) && !/advertisement no|vacanc|recruitment notification|result declared|admit card|answer key|examination date/i.test(sourceText.slice(0, 6000))) {
      return NextResponse.json({ success: false, error: "Ye specific notice ke bajay generic listing/homepage lag raha hai. Import Queue mein is page ko notice samajhkar fields nahi bhare gaye." }, { status: 422 });
    }
    const fields = extractFields(sourceText, item as Data, response.url || parsed.toString());
    const meta: Record<string, string> = {};
    for (const match of html.matchAll(/<meta\s+[^>]*(?:name|property)=["']([^"']+)["'][^>]*content=["']([^"']*)["'][^>]*>/gi)) meta[match[1].toLowerCase()] = decodeHtml(match[2]);
    if (!fields.title && meta["og:title"]) fields.title = meta["og:title"];
    if (!fields.description && (meta.description || meta["og:description"])) fields.description = meta.description || meta["og:description"];
    return NextResponse.json({ success: true, fields, extractedCharacters: sourceText.length, extractionMethod: "official-html-regex", sourceUrl: response.url || parsed.toString() });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unexpected Auto Fill error.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
