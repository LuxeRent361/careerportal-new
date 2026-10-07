import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | CareerPortal",
  description:
    "Read the CareerPortal privacy policy and learn how information is handled on the website.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <h1 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Last updated: October 2026
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="space-y-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <PolicySection
            title="1. Information We Collect"
            text="CareerPortal may collect information that users voluntarily provide, such as account information or messages submitted through available website features. Technical information such as browser type, device information and basic usage data may also be processed by standard web technologies."
          />

          <PolicySection
            title="2. How We Use Information"
            text="Information may be used to provide website functionality, maintain user accounts, improve the website, respond to enquiries, protect the service and understand how visitors use the platform."
          />

          <PolicySection
            title="3. Cookies"
            text="CareerPortal may use cookies and similar technologies for authentication, preferences, analytics and other website functionality. Third-party advertising or analytics services may also use cookies according to their own policies."
          />

          <PolicySection
            title="4. Third-Party Services"
            text="The website may use third-party services for authentication, hosting, analytics, advertising or other technical functionality. Those services may process information according to their respective privacy policies."
          />

          <PolicySection
            title="5. Data Security"
            text="We take reasonable measures to protect information handled through the website. However, no internet-based service can guarantee absolute security."
          />

          <PolicySection
            title="6. External Links"
            text="CareerPortal may link to external websites, including official government and organization websites. We are not responsible for the privacy practices or content of external websites."
          />

          <PolicySection
            title="7. Contact"
            text="For privacy-related questions, please contact CareerPortal through the contact information provided on the Contact Us page."
          />
        </div>
      </article>
    </main>
  );
}

function PolicySection({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <section>
      <h2 className="text-lg font-extrabold text-slate-900">
        {title}
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-600">
        {text}
      </p>
    </section>
  );
}