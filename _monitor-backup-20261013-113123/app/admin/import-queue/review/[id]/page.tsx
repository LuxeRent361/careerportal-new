import Link from "next/link";

import { notFound, redirect } from "next/navigation";

import { createClient } from "@supabase/supabase-js";

import { revalidatePath } from "next/cache";

import { getCurrentAdmin, getCurrentUser } from "@/lib/auth/admin";
import AutoFillButton from "./AutoFillButton";



export const dynamic = "force-dynamic";



type Props = {

  params: Promise<{ id: string }>;

  searchParams: Promise<{ saved?: string; error?: string }>;

};



type Data = Record<string, any>;



function db() {

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;



  if (!url || !key) {

    throw new Error("Supabase environment variables are missing.");

  }



  return createClient(url, key, {

    auth: { autoRefreshToken: false, persistSession: false },

  });

}



function str(value: any, fallback = ""): string {

  if (value === null || value === undefined) return fallback;

  if (typeof value === "string") return value;

  if (typeof value === "number" || typeof value === "boolean") {

    return String(value);

  }

  return fallback;

}





function object(value: any): Data {

  if (value && typeof value === "object" && !Array.isArray(value)) {

    return value;

  }



  if (typeof value === "string") {

    try {

      const parsed = JSON.parse(value);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {

        return parsed;

      }

    } catch {}

  }



  return {};

}



function label(value: string) {

  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());

}



function date(value: string) {

  if (!value) return "Not available";



  const d = new Date(value);



  return Number.isNaN(d.getTime())

    ? value

    : new Intl.DateTimeFormat("en-IN", {

        dateStyle: "medium",

        timeStyle: "short",

      }).format(d);

}



function makeSlug(value: string): string {

  return value

    .normalize("NFKD")

    .toLowerCase()

    .replace(/[^a-z0-9]+/g, "-")

    .replace(/^-+|-+$/g, "")

    .slice(0, 150);

}



function dateValue(value: unknown): string | null {

  const input = str(value).trim();

  if (!input) return null;



  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {

    const parsed = new Date(`${input}T00:00:00.000Z`);

    return !Number.isNaN(parsed.getTime()) &&

      parsed.toISOString().slice(0, 10) === input

      ? input

      : null;

  }



  const parsed = new Date(input);

  if (Number.isNaN(parsed.getTime())) return null;



  return parsed.toISOString().slice(0, 10);

}



function validUrl(...values: string[]): string {

  for (const value of values) {

    try {

      const url = new URL(value.trim());



      if (url.protocol === "https:" || url.protocol === "http:") {

        return url.toString();

      }

    } catch {}

  }



  return "";

}



function flattenContent(value: Data, depth = 0): Data {

  if (depth > 5) return value;



  const result: Data = { ...value };



  // Importers may wrap the useful fields inside another object.

  const nestedKeys = [

    "data",

    "content",

    "item",

    "notice",

    "result",

    "record",

    "attributes",

    "normalized_content",

    "content_data",

    "payload",

  ];



  for (const key of nestedKeys) {

    const nested = object(value[key]);



    if (Object.keys(nested).length > 0) {

      Object.assign(result, flattenContent(nested, depth + 1), result);

    }

  }



  return result;

}



function mergedContent(item: Data): Data {

  // raw_content is the fallback. Manually reviewed values take priority.

  const sources = [

    object(item.raw_content),

    object(item.metadata),

    object(item.payload),

    object(item.normalized_content),

    object(item.content_data),

  ];



  const result: Data = {};



  for (const source of sources) {

    Object.assign(result, flattenContent(source));

  }



  return result;

}



function getValue(content: Data, ...keys: string[]): string {

  for (const key of keys) {

    const value = content[key];



    if (typeof value === "string" || typeof value === "number") {

      const result = String(value).trim();

      if (result) return result;

    }

  }



  return "";

}



function normalizeType(value: string): string {

  const type = value

    .toLowerCase()

    .trim()

    .replace(/-/g, "_")

    .replace(/\s+/g, "_");



  const aliases: Record<string, string> = {

    jobs: "job",

    recruitment: "job",

    exams: "exam",

    results: "result",

    marks: "result",

    admit_cards: "admit_card",

    answer_keys: "answer_key",

    syllabi: "syllabus",

    notifications: "notification",

    notice: "public_notice",

    public_notices: "public_notice",

  };



  return aliases[type] || type;

}



function normalizeFormValues(item: Data): Data {

  const values = mergedContent(item);



  const attachments = Array.isArray(values.attachments)

    ? values.attachments.map(object)

    : [];



  const attachmentUrls = attachments.map(attachment =>

    validUrl(

      str(attachment.url),

      str(attachment.official_url),

      str(attachment.download_url),

      str(attachment.href)

    )

  );



  const firstAttachment = attachments[0] || {};



  const sourceUrl = validUrl(str(item.source_url));



  // Prefer a genuine homepage field; otherwise use the source page's domain.

  const explicitHomepage = validUrl(

    getValue(values, "source_homepage"),

    getValue(values, "official_website"),

    getValue(values, "website"),

    getValue(values, "homepage"),

    getValue(object(item.metadata), "source_homepage")

  );



  let homepage = explicitHomepage;



  if (!homepage && sourceUrl) {

    try {

      homepage = new URL(sourceUrl).origin;

    } catch {}

  }



  const documentUrl = validUrl(

    getValue(values, "notification_url"),

    getValue(values, "document_url"),

    getValue(values, "official_url"),

    getValue(values, "pdf_url"),

    getValue(values, "url"),

    getValue(values, "redirect_url"),

    getValue(values, "download_url"),

    str(firstAttachment.url),

    str(firstAttachment.official_url),

    str(firstAttachment.download_url),

    ...attachmentUrls,

    sourceUrl

  );



  const contentType = normalizeType(

    getValue(values, "content_type") ||

    str(item.content_type || item.item_type, "notification")

  );



  return {

    ...values,



    title:

      getValue(values, "title", "headline", "post_title", "name") ||

      str(item.title) ||

      str(item.source_title),



    content_type: contentType,



    category:

      getValue(values, "category", "category_name") || "General",



    organization:

      getValue(

        values,

        "organization",

        "department",

        "source_name",

        "organisation",

        "company_name"

      ) ||

      str(item.source_name) ||

      str(item.source_code),



    post_name: getValue(

      values,

      "post_name",

      "postName",

      "exam_name",

      "examName",

      "position"

    ),



    state: getValue(values, "state", "job_state") || "All India",



    job_location: getValue(

      values,

      "job_location",

      "location",

      "place_of_posting"

    ),



    job_type: getValue(

      values,

      "job_type",

      "employment_type",

      "employmentType"

    ),



    total_vacancies: getValue(

      values,

      "total_vacancies",

      "vacancies",

      "total_posts",

      "number_of_vacancies",

      "numberOfVacancies"

    ),



    qualification: getValue(

      values,

      "qualification",

      "educational_qualification",

      "education_qualification",

      "eligibility",

      "essential_qualification"

    ),



    age_limit: getValue(values, "age_limit", "ageLimit"),

    age_relaxation: getValue(values, "age_relaxation", "ageRelaxation"),



    salary: getValue(

      values,

      "salary",

      "pay_scale",

      "salary_details",

      "payScale"

    ),



    application_fee: getValue(

      values,

      "application_fee",

      "fee",

      "fees",

      "applicationFee"

    ),



    application_start: getValue(

      values,

      "application_start",

      "start_date",

      "startDate",

      "applicationStartDate"

    ),



    last_date: getValue(

      values,

      "last_date",

      "last_date_to_apply",

      "end_date",

      "endDate",

      "lastDate"

    ),



    exam_date: getValue(values, "exam_date", "examDate"),

    result_date: getValue(values, "result_date", "resultDate"),



    admit_card_date: getValue(

      values,

      "admit_card_date",

      "release_date",

      "admitCardDate"

    ),



    publication_date: getValue(

      values,

      "publication_date",

      "official_created_at",

      "created_at",

      "createdAt",

      "discovered_at"

    ),



    expiry_date: getValue(values, "expiry_date", "expiryDate"),



    official_website: homepage,



    notification_url: documentUrl,



    apply_url: validUrl(

      getValue(values, "apply_url", "applyUrl", "application_url")

    ),



    result_url: validUrl(

      getValue(values, "result_url", "resultUrl")

    ),



    admit_card_url: validUrl(

      getValue(values, "admit_card_url", "admitCardUrl")

    ),



    answer_key_url: validUrl(

      getValue(values, "answer_key_url", "answerKeyUrl"),

      getValue(values, "pdf_url"),

      ...attachmentUrls

    ),



    syllabus_url: validUrl(

      getValue(values, "syllabus_url", "syllabusUrl"),

      getValue(values, "pdf_url")

    ),



    description: getValue(

      values,

      "description",

      "summary",

      "message",

      "details",

      "body"

    ),



    source_homepage: homepage,



    official_url: getValue(values, "official_url"),



    document_url:

      getValue(values, "document_url") || documentUrl,

  };

}





async function adminCheck() {

  const user = await getCurrentUser();



  if (!user) redirect("/login?next=/admin/import-queue");



  const admin = await getCurrentAdmin();

  if (!admin) redirect("/profile");



  return user;

}



async function saveDetails(formData: FormData) {

  "use server";



  await adminCheck();



  const id = str(formData.get("id")).trim();

  if (!id) redirect("/admin/import-queue");



  const supabase = db();



  const { data: existing, error: readError } = await supabase

    .from("content_import_queue")

    .select("*")

    .eq("id", id)

    .maybeSingle();



  if (readError || !existing) {

    redirect(

      `/admin/import-queue?error=${encodeURIComponent(

        readError?.message || "Record not found"

      )}`

    );

  }



  const oldData = object(existing.content_data);

  const oldNormalized = object(existing.normalized_content);

  const oldValues = normalizeFormValues(existing);



  const fields = [

    "title", "content_type", "category", "organization", "post_name",

    "total_vacancies", "qualification", "age_limit", "age_relaxation",

    "salary", "application_fee", "application_start", "last_date",

    "exam_date", "result_date", "admit_card_date", "publication_date",

    "expiry_date", "selection_process", "exam_pattern", "syllabus",

    "description", "how_to_apply", "required_documents", "official_website",

    "notification_url", "apply_url", "result_url", "admit_card_url",

    "answer_key_url", "state", "job_location", "job_type", "important_dates",

    "instructions", "faqs", "department", "employment_type", "eligibility",

    "exam_type", "exam_name", "education_level", "career_scope", "fees",

    "duration", "answer_key_date", "objection_start_date",

    "objection_last_date", "notice_type", "pdf_url", "syllabus_url",

    "official_url", "redirect_url", "document_url", "url", "exam_id",

    "notice_id", "language", "source_code", "source_homepage",

    "official_created_at", "start_date", "end_date", "attachment_count",

    "review_required",

  ];



  const details: Data = { ...oldData };



  for (const field of fields) {

    const submitted = formData.get(field);



    // An omitted form field must not erase previously imported source data.

    if (submitted === null) continue;



    const value = str(submitted).trim();



    if (value !== "") {

      details[field] = value;

    } else if (!str(oldValues[field]).trim()) {

      details[field] = "";

    } else {

      // Keep original data when the field was blanked accidentally.

      details[field] = oldData[field] ?? oldValues[field];

    }

  }



  // Keep every named field submitted by the form in content_data.
  for (const [key, rawValue] of formData.entries()) {
    if (!key || key === "id" || key === "extra_details_json" || key.startsWith("$ACTION_") || rawValue instanceof File) continue;
    const value = str(rawValue).trim();
    if (value) details[key] = value;
  }

  const extraJson = str(formData.get("extra_details_json")).trim();
  if (extraJson) {
    try {
      const parsed = JSON.parse(extraJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) Object.assign(details, parsed);
    } catch {
      redirect(`/admin/import-queue/review/${encodeURIComponent(id)}?error=${encodeURIComponent("Extra details must be valid JSON.")}`);
    }
  }

  details.updated_manually_at = new Date().toISOString();



  const normalized = {

    ...oldNormalized,

    ...details,

  };



  const update: Data = {

    title: details.title || str(existing.title, "Untitled item"),

    content_type: normalizeType(

      details.content_type || str(existing.content_type, "notification")

    ),

    content_data: details,

    normalized_content: normalized,

    updated_at: new Date().toISOString(),

  };



  const { error } = await supabase

    .from("content_import_queue")

    .update(update)

    .eq("id", id);



  if (error) {

    redirect(

      `/admin/import-queue/review/${encodeURIComponent(id)}?error=${encodeURIComponent(error.message)}`

    );

  }



  redirect(

    `/admin/import-queue/review/${encodeURIComponent(id)}?saved=details`

  );

}



async function changeStatus(formData: FormData) {

  "use server";



  await adminCheck();



  const id = str(formData.get("id")).trim();

  const status = str(formData.get("status")).trim();



  if (!id || !["approved", "rejected"].includes(status)) {

    redirect("/admin/import-queue");

  }



  const supabase = db();



  const { error } = await supabase

    .from("content_import_queue")

    .update({

      status,

      updated_at: new Date().toISOString(),

    })

    .eq("id", id);



  if (error) {

    redirect(

      `/admin/import-queue/review/${encodeURIComponent(id)}?error=${encodeURIComponent(error.message)}`

    );

  }



  redirect(

    `/admin/import-queue/review/${encodeURIComponent(id)}?saved=${status}`

  );

}



async function deleteItem(formData: FormData) {

  "use server";



  await adminCheck();



  const id = str(formData.get("id")).trim();

  if (!id) redirect("/admin/import-queue");



  const supabase = db();



  const { error } = await supabase

    .from("content_import_queue")

    .delete()

    .eq("id", id);



  if (error) {

    redirect(

      `/admin/import-queue/review/${encodeURIComponent(id)}?error=${encodeURIComponent(error.message)}`

    );

  }



  redirect("/admin/import-queue");

}



async function publishItem(formData: FormData) {

  "use server";



  const user = await adminCheck();

  const id = str(formData.get("id")).trim();



  if (!id) redirect("/admin/import-queue");



  const supabase = db();

  const base = `/admin/import-queue/review/${encodeURIComponent(id)}`;



  const fail = (message: string): never => {

    redirect(`${base}?error=${encodeURIComponent(message)}`);

  };



  const { data: item, error: readError } = await supabase

    .from("content_import_queue")

    .select("*")

    .eq("id", id)

    .maybeSingle();



  if (readError || !item) {

    fail(readError?.message || "Queue record nahi mila.");

  }



  if (str(item.status).toLowerCase() !== "approved") {

    fail("Pehle record ko Approve karein.");

  }



  const content = normalizeFormValues(item);



  const get = (...keys: string[]) => getValue(content, ...keys);



  const title = get("title") || str(item.title).trim();

  if (!title) fail("Title bharna zaroori hai.");



  const typeText = normalizeType(

    get("content_type") ||

    str(item.content_type) ||

    str(item.item_type) ||

    "notification"

  );



  const lowerTitle = title.toLowerCase();



  // Results/marks notices should never be published as job vacancies.

  const looksLikeResult =

    /\b(uploading marks|marks of|result|score card|scorecard|final marks|merit list|marks uploaded)\b/i.test(

      lowerTitle

    );



  let type = typeText;



  if (looksLikeResult && [

    "answer_key", "notification", "notice", "public_notice",

  ].includes(type)) {

    type = "result";

  }



  const tableByType: Record<string, string> = {

    job: "jobs",

    jobs: "jobs",

    recruitment: "jobs",

    exam: "exams",

    exams: "exams",

    result: "results",

    results: "results",

    marks: "results",

    admit_card: "admit_cards",

    admit_cards: "admit_cards",

    education: "education",

    answer_key: "answer_keys",

    answer_keys: "answer_keys",

    syllabus: "syllabi",

    syllabi: "syllabi",

    notification: "public_notices",

    notifications: "public_notices",

    notice: "public_notices",

    public_notice: "public_notices",

    public_notices: "public_notices",

  };



  const table = tableByType[type];

  if (!table) fail(`Unsupported content type: ${type}`);



  const officialHomepage = validUrl(

    get("source_homepage"),

    get("official_website"),

    get("website")

  );



  const documentUrl = validUrl(

    get("notification_url"),

    get("document_url"),

    get("official_url"),

    get("url"),

    get("redirect_url"),

    get("answer_key_url"),

    get("result_url"),

    get("admit_card_url"),

    get("pdf_url"),

    get("syllabus_url")

  );



  const applyUrl = validUrl(get("apply_url"));



  // A valid official document link is required before publishing.

  if (!documentUrl && !officialHomepage && !applyUrl) {

    fail("Publish se pehle official website ya PDF URL bharein.");

  }



  let categoryId: string | null = null;

  const categoryName = get("category", "category_name");



  if (categoryName) {

    const categorySlug = makeSlug(categoryName);



    if (categorySlug) {

      const { data } = await supabase

        .from("categories")

        .select("id")

        .eq("is_active", true)

        .eq("slug", categorySlug)

        .limit(1)

        .maybeSingle();



      if (data?.id) categoryId = data.id;

    }



    if (!categoryId) {

      const { data } = await supabase

        .from("categories")

        .select("id")

        .eq("is_active", true)

        .ilike("name", categoryName)

        .limit(1)

        .maybeSingle();



      if (data?.id) categoryId = data.id;

    }

  }



  const slugBase = makeSlug(title);

  if (!slugBase) fail("Valid slug nahi ban saka.");



  const organization =

    get("organization", "department", "source_name") ||

    str(item.source_name) ||

    str(item.source_code);



  const description = get("description", "summary", "message") || null;



  const dates = {

    application_start: dateValue(get("application_start", "start_date")),

    last_date: dateValue(get("last_date", "end_date")),

    exam_date: dateValue(get("exam_date")),

    result_date: dateValue(get("result_date")),

    expiry_date: dateValue(get("expiry_date")),

  };



  const common: Data = {

    title,

    slug: `${slugBase}-${id.replace(/-/g, "").slice(0, 8)}`,

    category_id: categoryId,

    description,

    official_website: officialHomepage || null,

    is_published: true,

    is_featured: false,

    updated_at: new Date().toISOString(),

  };



  let record: Data;



  if (table === "jobs") {

    record = {

      ...common,

      organization: organization || null,

      department: get("department") || organization || null,

      location: get("job_location", "location", "state") || null,

      job_type: get("job_type") || null,

      employment_type: get("employment_type") || null,

      qualification: get("qualification", "eligibility") || null,

      vacancies: get("total_vacancies", "vacancies") || null,

      age_limit: get("age_limit") || null,

      salary: get("salary", "pay_scale") || null,

      application_fee: get("application_fee", "fees") || null,

      eligibility: get("eligibility", "qualification") || null,

      selection_process: get("selection_process") || null,

      important_dates: get("important_dates") || null,

      how_to_apply: get("how_to_apply") || null,

      documents_required: get("required_documents", "documents_required") || null,

      notification_url: documentUrl || null,

      apply_url: applyUrl || null,

      application_start: dates.application_start,

      last_date: dates.last_date,

      exam_date: dates.exam_date,

      expiry_date: dates.expiry_date,

    };

  } else if (table === "exams") {

    record = {

      ...common,

      organization: organization || null,

      exam_type: get("exam_type", "job_type") || null,

      eligibility: get("eligibility", "qualification") || null,

      syllabus: get("syllabus") || null,

      selection_process: get("selection_process") || null,

      notification_url: documentUrl || null,

      apply_url: applyUrl || null,

      application_start: dates.application_start,

      last_date: dates.last_date,

      exam_date: dates.exam_date,

      result_date: dates.result_date,

      expiry_date: dates.expiry_date,

    };

  } else if (table === "results") {

    record = {

      ...common,

      organization: organization || null,

      exam_name: get("exam_name", "post_name") || title,

      qualification: get("qualification") || null,

      result_date: dates.result_date ||

        dateValue(get("publication_date", "official_created_at")),

      expiry_date: dates.expiry_date,

      result_url: validUrl(

        get("result_url"),

        documentUrl,

        get("official_url")

      ) || null,

      status: "published",

    };

  } else if (table === "admit_cards") {

    record = {

      ...common,

      organization: organization || null,

      exam_name: get("exam_name", "post_name") || title,

      exam_date: dates.exam_date,

      release_date: dateValue(get("admit_card_date", "release_date")),

      expiry_date: dates.expiry_date,

      admit_card_url: validUrl(get("admit_card_url"), documentUrl) || null,

    };

  } else if (table === "education") {

    record = {

      ...common,

      education_level: get("education_level", "qualification") || null,

      eligibility: get("eligibility", "qualification") || null,

      syllabus: get("syllabus") || null,

      career_scope: get("career_scope") || null,

      fees: get("fees", "application_fee") || null,

      duration: get("duration") || null,

    };

  } else if (table === "answer_keys") {

    record = {

      ...common,

      organization: organization || null,

      exam_name: get("exam_name", "post_name") || title,

      answer_key_date: dateValue(get("answer_key_date", "publication_date")),

      objection_start_date: dateValue(get("objection_start_date")),

      objection_last_date: dateValue(get("objection_last_date")),

      answer_key_url: validUrl(get("answer_key_url"), documentUrl) || null,

      notification_url: documentUrl || null,

      expiry_date: dates.expiry_date,

    };

  } else if (table === "syllabi") {

    record = {

      ...common,

      organization: organization || null,

      exam_name: get("exam_name", "post_name") || title,

      syllabus: get("syllabus") || null,

      exam_pattern: get("exam_pattern") || null,

      pdf_url: validUrl(get("syllabus_url"), get("pdf_url"), documentUrl) || null,

      notification_url: documentUrl || null,

      expiry_date: dates.expiry_date,

    };

  } else {

    record = {

      ...common,

      organization: organization || null,

      notice_type: get("notice_type") || type,

      publication_date: dateValue(get("publication_date", "official_created_at")),

      start_date: dates.application_start,

      last_date: dates.last_date,

      document_url: documentUrl || null,

      notification_url: documentUrl || null,

      expiry_date: dates.expiry_date,

    };

  }



  const { data: duplicate, error: duplicateError } = await supabase

    .from(table)

    .select("id")

    .eq("title", title)

    .limit(1)

    .maybeSingle();



  if (duplicateError) fail(duplicateError.message);



  if (duplicate) {

    fail("Is title ka record pehle se public table mein hai. Duplicate publish rok diya gaya.");

  }



  const { error: insertError } = await supabase

    .from(table)

    .insert(record);



  if (insertError) fail(insertError.message);



  const now = new Date().toISOString();



  const { error: queueError } = await supabase

    .from("content_import_queue")

    .update({

      status: "published",

      imported_at: now,

      reviewed_at: now,

      reviewed_by: user.email || null,

      updated_at: now,

      error_message: null,

    })

    .eq("id", id)

    .eq("status", "approved");



  if (queueError) {

    fail(

      `Public record insert ho gaya, lekin queue status update nahi hua: ${queueError.message}`

    );

  }



  const paths: Record<string, string> = {

    jobs: "/jobs",

    exams: "/exam",

    results: "/results",

    admit_cards: "/admit-cards",

    education: "/education",

    answer_keys: "/answer-keys",

    syllabi: "/syllabus",

    public_notices: "/notifications",

  };



  revalidatePath(paths[table]);

  revalidatePath("/");

  revalidatePath("/admin/import-queue");



  redirect(`${base}?saved=published`);

}



type FormField = [name: string, title: string, type: "text" | "textarea" | "url" | "select"];
type FormGroup = { title: string; fields: FormField[] };

const commonGroups: FormGroup[] = [
  { title: "Basic Information", fields: [
    ["title", "Notification / Post Title", "text"],
    ["content_type", "Content Type (change and save to load its fields)", "select"],
    ["category", "Category", "text"],
    ["organization", "Department / Organization", "text"],
    ["official_website", "Official Website URL", "url"],
    ["notification_url", "Official Notification / PDF URL", "url"],
    ["description", "Full Description / Notice Text", "textarea"],
  ]},
];

const categoryGroups: Record<string, FormGroup[]> = {
  job: [
    { title: "Post & Vacancy", fields: [
      ["post_name", "Post Name", "text"], ["department", "Department", "text"],
      ["state", "State / All India", "text"], ["job_location", "Job Location", "text"],
      ["job_type", "Job Type", "text"], ["employment_type", "Employment Type", "text"],
      ["total_vacancies", "Total Vacancies", "text"],
    ]},
    { title: "Eligibility & Salary", fields: [
      ["qualification", "Educational Qualification", "textarea"], ["eligibility", "Eligibility", "textarea"],
      ["age_limit", "Age Limit", "text"], ["age_relaxation", "Age Relaxation", "textarea"],
      ["salary", "Salary / Pay Scale", "text"], ["application_fee", "Application Fee", "textarea"],
    ]},
    { title: "Dates & Application", fields: [
      ["publication_date", "Notification Date", "text"], ["application_start", "Application Start Date", "text"],
      ["last_date", "Last Date to Apply", "text"], ["exam_date", "Exam Date", "text"],
      ["expiry_date", "Expiry Date", "text"], ["important_dates", "Other Important Dates", "textarea"],
      ["selection_process", "Selection Process", "textarea"], ["how_to_apply", "How to Apply", "textarea"],
      ["required_documents", "Required Documents", "textarea"], ["instructions", "Important Instructions", "textarea"],
      ["apply_url", "Apply Online URL", "url"], ["result_url", "Result URL (if applicable)", "url"],
    ]},
  ],
  exam: [{ title: "Exam Details", fields: [
    ["exam_name", "Exam Name", "text"], ["exam_type", "Exam Type", "text"],
    ["qualification", "Qualification", "textarea"], ["eligibility", "Eligibility", "textarea"],
    ["application_start", "Application Start Date", "text"], ["last_date", "Last Date", "text"],
    ["exam_date", "Exam Date", "text"], ["result_date", "Result Date", "text"],
    ["selection_process", "Selection Process", "textarea"], ["exam_pattern", "Exam Pattern", "textarea"],
    ["syllabus", "Syllabus", "textarea"], ["apply_url", "Apply Online URL", "url"],
    ["important_dates", "Other Important Dates", "textarea"], ["expiry_date", "Expiry Date", "text"],
  ]}],
  result: [{ title: "Result Details", fields: [
    ["exam_name", "Exam Name", "text"], ["qualification", "Qualification / Result Group", "textarea"],
    ["result_date", "Result Date", "text"], ["result_url", "Official Result URL", "url"], ["expiry_date", "Expiry Date", "text"],
  ]}],
  admit_card: [{ title: "Admit Card Details", fields: [
    ["exam_name", "Exam Name", "text"], ["admit_card_date", "Admit Card Release Date", "text"],
    ["exam_date", "Exam Date", "text"], ["admit_card_url", "Official Admit Card URL", "url"],
    ["required_documents", "Documents / Login Requirements", "textarea"], ["expiry_date", "Expiry Date", "text"],
  ]}],
  answer_key: [{ title: "Answer Key & Objection Details", fields: [
    ["exam_name", "Exam Name", "text"], ["answer_key_date", "Answer Key Release Date", "text"],
    ["answer_key_url", "Official Answer Key URL", "url"], ["objection_start_date", "Objection Start Date", "text"],
    ["objection_last_date", "Last Date for Objection", "text"], ["expiry_date", "Expiry Date", "text"],
  ]}],
  syllabus: [{ title: "Syllabus & Exam Pattern", fields: [
    ["exam_name", "Exam Name", "text"], ["syllabus", "Syllabus Details", "textarea"],
    ["exam_pattern", "Exam Pattern", "textarea"], ["syllabus_url", "Official Syllabus PDF URL", "url"],
    ["expiry_date", "Expiry Date", "text"],
  ]}],
  education: [{ title: "Education / Course Details", fields: [
    ["education_level", "Education Level", "text"], ["qualification", "Qualification", "textarea"],
    ["eligibility", "Eligibility", "textarea"], ["duration", "Course Duration", "text"],
    ["fees", "Course Fees", "text"], ["syllabus", "Syllabus / Curriculum", "textarea"],
    ["career_scope", "Career Scope", "textarea"],
  ]}],
  notification: [{ title: "Notice Details", fields: [
    ["notice_type", "Notice Type", "text"], ["publication_date", "Publication Date", "text"],
    ["start_date", "Start Date", "text"], ["last_date", "Last Date", "text"],
    ["document_url", "Official Document URL", "url"], ["instructions", "Instructions", "textarea"],
    ["expiry_date", "Expiry Date", "text"],
  ]}],
  public_notice: [{ title: "Public Notice Details", fields: [
    ["notice_type", "Notice Type", "text"], ["publication_date", "Publication Date", "text"],
    ["start_date", "Start Date", "text"], ["last_date", "Last Date", "text"],
    ["document_url", "Official Document URL", "url"], ["instructions", "Instructions", "textarea"],
    ["expiry_date", "Expiry Date", "text"],
  ]}],
};

const defaultGroups: FormGroup[] = [{ title: "Additional Details", fields: [
  ["post_name", "Post / Exam Name", "text"], ["important_dates", "Important Dates", "textarea"],
  ["instructions", "Instructions", "textarea"], ["expiry_date", "Expiry Date", "text"],
]}];

const knownFieldNames = new Set<string>([
  "title",
  "content_type",
  "category",
  "organization",
  "official_website",
  "notification_url",
  "description",
  ...Object.values(categoryGroups).flatMap((groups) =>
    groups.flatMap((group) =>
      group.fields.map(([name]) => String(name))
    )
  ),
  ...commonGroups.flatMap((group) =>
    group.fields.map(([name]) => String(name))
  ),
  ...defaultGroups.flatMap((group) =>
    group.fields.map(([name]) => String(name))
  ),
  "updated_manually_at",
  "extra_details_json",
]);

function Field({

  name,

  title,

  type,

  value,

}: {

  name: string;

  title: string;

  type: string;

  value: string;

}) {

  const className =

    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";



  return (

    <div className="min-w-0">

      <label htmlFor={name} className="text-sm font-bold text-slate-800">

        {title}

      </label>



      {type === "textarea" ? (

        <textarea

          id={name}

          name={name}

          defaultValue={value}

          rows={4}

          className={className}

        />

      ) : type === "select" ? (

        <select

          id={name}

          name={name}

          defaultValue={value || "notification"}

          className={className}

        >

          {[

            "job", "exam", "result", "admit_card", "answer_key",

            "syllabus", "notification", "public_notice", "education",

          ].map(option => (

            <option key={option} value={option}>

              {label(option)}

            </option>

          ))}

        </select>

      ) : (

        <input

          id={name}

          name={name}

          type={type === "url" ? "url" : "text"}

          defaultValue={value}

          className={className}

        />

      )}

    </div>

  );

}



export default async function ImportQueueReviewPage({

  params,

  searchParams,

}: Props) {

  await adminCheck();



  const { id } = await params;

  const query = await searchParams;

  const supabase = db();



  const { data: item, error } = await supabase

    .from("content_import_queue")

    .select("*")

    .eq("id", id)

    .maybeSingle();



  if (error) {

    return (

      <main className="mx-auto max-w-4xl p-6">

        <h1 className="text-xl font-bold">Unable to load record</h1>

        <p className="mt-2 break-words text-red-700">{error.message}</p>

        <Link href="/admin/import-queue" className="mt-5 inline-block underline">

          Back to queue

        </Link>

      </main>

    );

  }



  if (!item) notFound();



  const content = object(item.content_data);

  const normalized = object(item.normalized_content);

  const payload = object(item.payload);

  const metadata = object(item.metadata);

  const raw = object(item.raw_content);

  const values = normalizeFormValues(item);

  const status = str(item.status, "pending").toLowerCase();
  const formType = normalizeType(str(values.content_type || item.content_type || item.item_type || "notification"));
  const selectedGroups: FormGroup[] = [...commonGroups, ...(categoryGroups[formType] || defaultGroups)];
  const extraDetails = Object.fromEntries(
    Object.entries(values).filter(([key, value]) => !knownFieldNames.has(key) && value !== null && value !== undefined)
  );



  return (

    <main className="mx-auto w-full max-w-[1450px] space-y-6 p-4 sm:p-8">

      <Link

        href="/admin/import-queue"

        className="inline-flex rounded-lg border px-4 py-2 text-sm font-bold hover:bg-slate-50"

      >

        ← Back to Import Queue

      </Link>



      <header className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <p className="text-xs font-extrabold uppercase tracking-widest text-emerald-800">

            CareerPortal · Import Review

          </p>

          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold uppercase text-amber-900">

            {label(status)}

          </span>

        </div>



        <h1 className="mt-4 break-words text-2xl font-black text-slate-950 sm:text-3xl">

          {str(item.title, "Untitled record")}

        </h1>



        <p className="mt-3 text-sm text-slate-600">

          Source: {str(item.source_name || item.source_code, "Unknown source")}

          {" · "}Imported: {date(str(item.created_at || item.imported_at))}

        </p>

      </header>



      {query.saved && (

        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 font-bold text-emerald-900">

          {query.saved === "details"

            ? "Details saved successfully."

            : `Record ${query.saved} successfully.`}

        </div>

      )}



      {query.error && (

        <div className="break-words rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">

          Error: {query.error}

        </div>

      )}



      <form id="content-details-form" action={saveDetails} className="space-y-6">

        <input type="hidden" name="id" value={id} />



        <div className="rounded-2xl border bg-white p-5 shadow-sm sm:p-7">

          <h2 className="text-xl font-black text-slate-950">

            Complete Content Details

          </h2>



          <p className="mt-2 text-sm leading-6 text-slate-600">

            उपलब्ध जानकारी जाँचें। तारीखों और official links की पुष्टि करें।

            जिस जानकारी का source में प्रमाण नहीं है, उसे अनुमान से न भरें।

          </p>



          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-bold text-blue-950">Official Notice Auto Fill</p>
            <p className="mt-1 text-sm leading-6 text-blue-900">Auto Fill उपलब्ध official notice/PDF से पहचानी गई जानकारी खाली fields में भरने की कोशिश करेगा। पहले भरें, फिर जानकारी जाँचकर Save करें।</p>
            <div className="mt-3"><AutoFillButton id={id} /></div>
          </div>

          <div className="mt-6 space-y-8">

            {selectedGroups.map(group => (

              <section key={group.title}>

                <h3 className="border-b pb-3 text-base font-extrabold text-emerald-900">

                  {group.title}

                </h3>



                <div className="mt-4 grid gap-5 sm:grid-cols-2">

                  {group.fields.map(([name, title, type]) => (

                    <Field

                      key={name}

                      name={name}

                      title={title}

                      type={type}

                      value={str(values[name])}

                    />

                  ))}

                </div>

              </section>

            ))}

          </div>



          <section className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-extrabold text-slate-900">Extra Source Details (JSON)</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">जो source fields standard options में नहीं हैं, वे यहाँ सुरक्षित रखे जा सकते हैं। JSON valid होना चाहिए।</p>
            <textarea name="extra_details_json" defaultValue={JSON.stringify(extraDetails, null, 2)} rows={8} spellCheck={false}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 font-mono text-xs text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
          </section>

          <button

            type="submit"

            className="mt-8 w-full rounded-xl bg-emerald-800 px-5 py-3.5 text-sm font-extrabold text-white hover:bg-emerald-900 sm:w-auto"

          >

            Save Content Details

          </button>

        </div>

      </form>



      <div className="grid gap-6 lg:grid-cols-2">

        <section className="rounded-2xl border bg-white p-5 shadow-sm">

          <h2 className="text-lg font-black">Source Information</h2>

          <p className="mt-2 break-all text-sm text-slate-600">

            Source URL: {str(item.source_url, "Not available")}

          </p>

          <p className="mt-2 text-sm text-slate-600">

            External Reference: {str(item.source_id, "Not available")}

          </p>

          <p className="mt-2 text-sm text-slate-600">

            Imported: {date(str(item.created_at || item.imported_at))}

          </p>

        </section>



        <section className="rounded-2xl border bg-white p-5 shadow-sm">

          <h2 className="text-lg font-black">Review Actions</h2>

          <p className="mt-2 text-sm leading-6 text-slate-600">

            पहले विवरण सेव करें। Approve करने से पहले official links और

            जानकारी जाँचें।

          </p>



          <div className="mt-5 grid gap-3">

            {status === "approved" && (

              <form action={publishItem}>

                <input type="hidden" name="id" value={id} />

                <button

                  type="submit"

                  className="w-full rounded-xl bg-emerald-800 px-4 py-3 font-extrabold text-white hover:bg-emerald-900"

                >

                  Publish to Website

                </button>

              </form>

            )}



            {(status === "pending" || status === "duplicate") && (

              <form action={changeStatus}>

                <input type="hidden" name="id" value={id} />

                <input type="hidden" name="status" value="approved" />

                <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-extrabold text-white hover:bg-emerald-800">

                  Approve Record

                </button>

              </form>

            )}



            {status !== "rejected" && status !== "published" && (

              <form action={changeStatus}>

                <input type="hidden" name="id" value={id} />

                <input type="hidden" name="status" value="rejected" />

                <button className="w-full rounded-xl border border-red-300 bg-red-50 px-4 py-3 font-extrabold text-red-800 hover:bg-red-100">

                  Reject Record

                </button>

              </form>

            )}



            <form action={deleteItem}>

              <input type="hidden" name="id" value={id} />

              <button className="w-full rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700 hover:bg-slate-50">

                Delete Queue Item

              </button>

            </form>



            <Link

              href="/admin/import-queue"

              className="rounded-xl border px-4 py-3 text-center text-sm font-bold hover:bg-slate-50"

            >

              Back to Import Queue

            </Link>

          </div>

        </section>

      </div>



      <details className="rounded-2xl border bg-white p-5">

        <summary className="cursor-pointer font-extrabold">

          Original Source Data (Debug)

        </summary>

        <pre className="mt-4 max-h-[500px] overflow-auto whitespace-pre-wrap break-words rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">

          {JSON.stringify(

            {

              raw_content: raw,

              content_data: content,

              normalized_content: normalized,

              payload,

              metadata,

            },

            null,

            2

          )}

        </pre>

      </details>

    </main>

  );

}
