import { useEffect } from "react";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { setMeta } from "@/lib/seo";

const Refunds = () => {
  useEffect(() => {
    setMeta(
      'Refund Policy — Pluggd',
      'Refund terms for subscriptions, beats, courses, and store purchases.',
      '/refunds'
    );
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <DomainAwareNavigation />
      <main className="pt-20 px-4 sm:px-6 lg:px-8">
        <article className="prose dark:prose-invert max-w-3xl mx-auto">
          <header>
            <h1>Refund Policy</h1>
            <p className="text-muted-foreground">Clear policies for peace of mind.</p>
          </header>

          <section>
            <h2>1. Subscriptions</h2>
            <p>
              Cancel anytime; billing stops next cycle. Prorated refunds are not offered unless required by law.
            </p>
          </section>

          <section>
            <h2>2. Digital Goods (Beats, Courses, Downloads)</h2>
            <p>
              All sales are final once access is granted or files are downloaded.
            </p>
          </section>

          <section>
            <h2>3. Physical Goods</h2>
            <p>
              Returns accepted within 14 days if unused and in original packaging; buyer covers return shipping unless defective.
            </p>
          </section>
        </article>
      </main>
    </div>
  );
};

export default Refunds;
