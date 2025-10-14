import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import { setMeta } from "@/lib/seo";

const Terms = () => {
  useEffect(() => {
    setMeta(
      'Terms of Service — Pluggd',
      'Terms governing the use of Pluggd services and content.',
      '/terms'
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <Navigation />
      <main className="pt-20 px-4 sm:px-6 lg:px-8">
        <article className="prose dark:prose-invert max-w-3xl mx-auto">
          <header>
            <h1>Terms of Service</h1>
            <p className="text-muted-foreground">
              Please review these terms carefully before using the platform.
            </p>
          </header>

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using Pluggd, you agree to be bound by these Terms of Service and all applicable laws.
            </p>
          </section>

          <section>
            <h2>2. Accounts and Access</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.
            </p>
          </section>

          <section>
            <h2>3. Licensing and Purchases</h2>
            <p>
              Licenses, purchases, and subscriptions are governed by the terms shown at checkout and license templates provided in-app.
            </p>
          </section>

          <section>
            <h2>4. Prohibited Conduct</h2>
            <p>No unlawful, infringing, or abusive use of the platform or content is permitted.</p>
          </section>

          <section>
            <h2>5. Changes</h2>
            <p>We may update these terms; material changes will be communicated via the app or email.</p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default Terms;
