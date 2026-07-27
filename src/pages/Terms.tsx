import { useEffect } from "react";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { setMeta } from "@/lib/seo";

const Terms = () => {
  useEffect(() => {
    setMeta("Terms of Service — PLUGGD", "Terms governing PLUGGD accounts, community, purchases and creator content.", "/terms");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <DomainAwareNavigation />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <article className="prose dark:prose-invert max-w-3xl mx-auto">
          <header>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">PLUGGD LEGAL</p>
            <h1>Terms of Service</h1>
            <p className="text-muted-foreground">Effective 27 July 2026. Please read these terms before using PLUGGD.</p>
          </header>
          <section>
            <h2>1. Eligibility and agreement</h2>
            <p>You must be at least 16 and able to enter a binding agreement to use PLUGGD. By creating an account or using the service, you agree to these Terms, the Privacy Policy and Community Guidelines.</p>
          </section>
          <section>
            <h2>2. Accounts</h2>
            <p>Provide accurate information, keep credentials secure and tell us promptly about unauthorised access. You are responsible for activity on your account. You may delete your account in the app at any time.</p>
          </section>
          <section>
            <h2>3. Your content and rights</h2>
            <p>You keep ownership of content you submit. You grant PLUGGD a worldwide, non-exclusive, royalty-free licence to host, reproduce, process, display and distribute that content only as needed to operate, promote and improve the service. You confirm that you hold the rights required to upload and license it.</p>
            <p>You may remove content, subject to completed purchases, licences granted to others, legal retention duties and reasonable backup cycles.</p>
          </section>
          <section>
            <h2>4. Community conduct</h2>
            <p>Do not post unlawful, abusive, hateful, sexually exploitative, deceptive, infringing or dangerous content; impersonate others; spam; manipulate engagement; evade blocks; scrape the service; or interfere with security. Our <a href="/community-guidelines">Community Guidelines</a> explain these rules and reporting options.</p>
          </section>
          <section>
            <h2>5. Purchases, credits and subscriptions</h2>
            <p>Digital purchases in the iOS app are processed by Apple and subject to Apple’s payment terms. Prices and included access are shown before purchase. PLUGGD credits have no cash value, cannot be transferred unless expressly stated and may be used only for eligible in-app items.</p>
            <p>Subscriptions renew until cancelled in Apple account settings. Deleting the app or your PLUGGD account does not cancel a subscription managed by Apple. Restores and refund requests are handled under Apple’s rules.</p>
          </section>
          <section>
            <h2>6. Creator sales and licences</h2>
            <p>Creators are responsible for accurate listings and for rights in music, beats, samples, merchandise and event inventory. Any specific licence displayed at purchase forms part of these Terms. PLUGGD may remove listings, delay access or hold funds where necessary to investigate fraud, rights disputes or safety issues.</p>
          </section>
          <section>
            <h2>7. Moderation and enforcement</h2>
            <p>We may review, restrict, remove or preserve content and may warn, suspend or terminate accounts to enforce these Terms, protect users or comply with law. Automated signals can assist review, but significant enforcement decisions may be appealed through support.</p>
          </section>
          <section>
            <h2>8. Service changes and availability</h2>
            <p>Features may change and uninterrupted availability is not guaranteed. We will take reasonable care in operating the service and communicate material changes where appropriate.</p>
          </section>
          <section>
            <h2>9. Liability</h2>
            <p>Nothing in these Terms excludes liability that cannot legally be excluded. To the maximum extent permitted by law, PLUGGD is not liable for indirect or consequential loss, lost profits, or content and conduct of other users.</p>
          </section>
          <section>
            <h2>10. Contact and changes</h2>
            <p>We may update these Terms and will identify the effective date of material changes. Contact <a href="mailto:support@pluggd.fm">support@pluggd.fm</a> with questions, disputes or appeals.</p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default Terms;
