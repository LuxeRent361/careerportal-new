CareerPortal Official Notice Monitor v2 — replacement bundle

इसका उद्देश्य पुराना hard-coded source-check engine बदलकर configured active official sources का unified monitor लगाना है। Existing queue/review/publish workflow रखा गया है ताकि current public data और admin publishing flow न टूटे। Database tables/data को delete नहीं किया गया है।

FILES
1) lib/automation/official-notice-monitor.ts — नया shared monitoring + notice extraction engine
2) app/api/admin/sources/check/route.ts — existing manual source checker की replacement; body {} = सभी active sources, {"source":"SSC"} = एक source
3) app/api/cron/official-notices/route.ts — scheduled scan endpoint
4) app/admin/official-monitor/page.tsx — नया one-click “Scan All Active Official Sources” dashboard
5) app/api/admin/import-queue/[id]/autofill/route.ts — existing Auto Fill API kept
6) app/admin/import-queue/review/[id]/page.tsx — existing review/publish page; known field list bug fixed
7) app/admin/import-queue/review/[id]/AutoFillButton.tsx — existing Auto Fill button kept

INSTALL
- Project root: C:\Users\javad\OneDrive\Desktop\careerportal-new
- ZIP extract करें और ZIP के अंदर वाले paths को project root में उसी path पर copy/merge करें। केवल ऊपर listed files replace/new add करें।
- पहले पुरानी files का backup रखें। कोई Supabase table/data delete न करें।
- Existing vercel.json हो तो उसे overwrite न करें। Package का vercel.json sample अलग रखा गया है; उसकी cron entry अपने existing config में merge करें, केवल यदि hosting Vercel है।

ENV VARS
- NEXT_PUBLIC_SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- CRON_SECRET (लंबा random secret; इसे public/frontend में न रखें)

MANUAL SCAN
Admin session के साथ POST /api/admin/sources/check
Body {} से सभी active sources scan होंगे। नया dashboard: /admin/official-monitor

SCHEDULED SCAN
GET /api/cron/official-notices
Header: Authorization: Bearer <CRON_SECRET>
Vercel hosting पर sample vercel.json हर 30 मिनट का schedule दिखाता है (plan/runtime support जरूरी)। दूसरे hosting पर hosting control panel में यही endpoint हर 30 मिनट CRON_SECRET header के साथ call करवाएँ।

IMPORTANT / HONEST LIMITS
- `content_sources` में active source, valid HTTPS `website_url`, और सही official domain configured होना चाहिए। हर विभाग को source registry में add करना होगा।
- Crawler homepage से notice-like official links खोजता है और individual notice/PDF पढ़ने की कोशिश करता है; generic home/career/list links को reject करता है और link title न हो तो row/list context देखता है।
- अलग-अलग government websites के HTML layout अलग हैं; CAPTCHA, 403, JS-only pages, changed website markup, scanned/image PDF (OCR नहीं), या missing label values की वजह से कुछ notices/fields miss हो सकते हैं। हर field भर जाने की guarantee बिना per-source parser/OCR के संभव नहीं है। Unavailable details invent नहीं की जातीं; original notice text Extra Source Details/raw data में रहता है।
- New notices pending review में आते हैं, auto-publish नहीं होते। अभी generic crawler से बिना review public table में auto-publish करना गलत category/date/vacancy को live कर सकता है। Existing publish action use करें।
- Build और live test user के project/hosting पर चलाना होगा; यह package आपके actual Supabase DB से connected test नहीं हुआ है।
