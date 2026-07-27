import { useEffect } from "react";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { setMeta } from "@/lib/seo";

const EFFECTIVE_DATE = "27 July 2026";

const Privacy = () => {
  useEffect(() => {
    setMeta("Privacy Policy — PLUGGD", "How PLUGGD collects, uses, protects, and gives you control of your data.", "/privacy");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <DomainAwareNavigation />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <article className="prose dark:prose-invert max-w-3xl mx-auto">
          <header>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">PLUGGD LEGAL</p>
            <h1>Privacy Policy</h1>
            <p className="text-muted-foreground">Effective {EFFECTIVE_DATE}. This policy covers the PLUGGD website and iOS app.</p>
          </header>

          <section>
            <h2>1. Data we collect</h2>
            <p>We collect account details such as your name, email, username, age band, profile information, preferences and authentication records. When you use PLUGGD, we process the music, posts, messages, follows, saves, reports, blocks, events and creator interactions you choose to create.</p>
            <p>For purchases and subscriptions, Apple processes your payment details. We receive transaction identifiers, product identifiers, subscription status and purchase dates needed to provide access, prevent fraud and keep financial records. We do not receive your full payment-card number from Apple.</p>
            <p>We also collect device and diagnostic information needed to operate and secure the service, such as app version, device type, IP-derived region, crash information, security events and push-notification tokens.</p>
          </section>

          <section>
            <h2>2. How we use data</h2>
            <p>We use data to provide playback and discovery, maintain your library and purchases, personalise recommendations, connect fans and creators, moderate content, respond to reports, prevent abuse, deliver notifications, provide support and comply with law.</p>
            <p>Age-band and content-safety preferences are used to limit potentially mature content. Sensitive-content filtering defaults to off until an eligible user chooses otherwise.</p>
          </section>

          <section>
            <h2>3. Service providers and sharing</h2>
            <p>We share only what is necessary with infrastructure, storage, analytics, communications, customer-support, fraud-prevention and payment providers acting for us. Public profile and community content is visible according to the audience you select. We may disclose information when legally required or to protect users, PLUGGD or the public.</p>
            <p>We do not sell personal information. We do not use data collected from the iOS app to track you across other companies’ apps or websites for advertising.</p>
          </section>

          <section>
            <h2>4. Retention and security</h2>
            <p>We retain account content while your account is active and delete or de-identify it when it is no longer needed. If you delete your account, personal profile and user content are removed; transaction, fraud-prevention, legal and safety records may be retained for the period required by law or necessary to protect the service.</p>
            <p>We use access controls, encryption in transit, private storage, logging and operational safeguards. No system can guarantee absolute security.</p>
          </section>

          <section>
            <h2>5. Your choices and rights</h2>
            <p>You can update profile and safety settings, block or unblock accounts, request a portable account archive, and permanently delete your account inside the app. Depending on where you live, you may also have rights to access, correct, object to, restrict or erase data, or appeal a privacy decision.</p>
            <p>Apple subscriptions must be cancelled through your Apple account; deleting PLUGGD does not automatically cancel a subscription managed by Apple.</p>
          </section>

          <section>
            <h2>6. Age eligibility</h2>
            <p>PLUGGD is intended for people aged 16 and over. We do not knowingly permit accounts for children under 16. Contact us if you believe an ineligible child has provided personal information.</p>
          </section>

          <section>
            <h2>7. International processing and updates</h2>
            <p>Data may be processed in countries other than your own with appropriate contractual and legal safeguards. We will post material policy changes here and, where appropriate, notify you in the app or by email.</p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>Questions or rights requests can be sent to <a href="mailto:support@pluggd.fm">support@pluggd.fm</a> or through our <a href="/help/contact">support page</a>.</p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default Privacy;
