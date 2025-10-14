import { useEffect } from "react";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { setMeta } from "@/lib/seo";

const Privacy = () => {
  useEffect(() => {
    setMeta(
      'Privacy Policy — Pluggd',
      'How Pluggd collects, uses, and protects your data.',
      '/privacy'
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <DomainAwareNavigation />
      <main className="pt-20 px-4 sm:px-6 lg:px-8">
        <article className="prose dark:prose-invert max-w-3xl mx-auto">
          <header>
            <h1>Privacy Policy</h1>
            <p className="text-muted-foreground">Your privacy matters to us.</p>
          </header>

          <section>
            <h2>1. Information We Collect</h2>
            <p>
              Account info, usage data, and transaction details as needed to operate the platform.
            </p>
          </section>

          <section>
            <h2>2. How We Use Information</h2>
            <p>
              To provide services, process payments, improve features, prevent fraud, and comply with law.
            </p>
          </section>

          <section>
            <h2>3. Sharing</h2>
            <p>
              We share with payment processors, service providers, or when required by law.
            </p>
          </section>

          <section>
            <h2>4. Your Rights</h2>
            <p>
              Access, correct, or delete your data where applicable; contact support for requests.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default Privacy;
