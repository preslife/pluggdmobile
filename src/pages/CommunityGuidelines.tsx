import { useEffect } from "react";
import DomainAwareNavigation from "@/components/DomainAwareNavigation";
import { setMeta } from "@/lib/seo";

const CommunityGuidelines = () => {
  useEffect(() => {
    setMeta("Community Guidelines — PLUGGD", "The standards that keep PLUGGD’s music community creative, safe and fair.", "/community-guidelines");
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <DomainAwareNavigation />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8">
        <article className="prose dark:prose-invert max-w-3xl mx-auto">
          <header>
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">CREATIVE WITH CARE</p>
            <h1>Community Guidelines</h1>
            <p className="text-muted-foreground">PLUGGD is built for discovery, collaboration and direct creator support. These standards apply to profiles, music, artwork, messages, comments, live rooms, events and listings.</p>
          </header>
          <section><h2>Respect people</h2><p>No harassment, credible threats, stalking, hateful conduct, targeted humiliation, doxxing or unwanted sexual content. Do not evade another member’s block or encourage coordinated abuse.</p></section>
          <section><h2>Protect young people</h2><p>Sexual exploitation or endangerment of minors is prohibited and may be reported to relevant authorities. PLUGGD accounts are for people aged 16 and over.</p></section>
          <section><h2>Share work you have rights to use</h2><p>Upload only music, artwork, samples, video and other material you own or are authorised to share. Respect licences, credits, trademarks and personality rights. Rights holders can report infringement through support.</p></section>
          <section><h2>Keep discovery authentic</h2><p>No spam, deceptive links, impersonation, fabricated engagement, misleading live status, fraudulent sales, malware or attempts to manipulate charts and recommendations.</p></section>
          <section><h2>Safety and sensitive content</h2><p>Do not promote terrorism, violent criminal organisations, self-harm, dangerous challenges or the sale of illegal goods. Mature artistic content may require labels and can be limited by age-aware filters. Graphic or exploitative material may be removed even when labelled.</p></section>
          <section><h2>Reporting, blocking and review</h2><p>Use the report option on a post or profile when something breaks these rules, and block an account for immediate personal control. Reports are confidential. Content with media or risk signals may be held for review before publication.</p></section>
          <section><h2>Enforcement and appeals</h2><p>We consider context, severity, history and risk. Actions can include reduced distribution, content removal, feature restrictions, suspension or termination. Contact <a href="mailto:support@pluggd.fm">support@pluggd.fm</a> to appeal or report an urgent safety concern.</p></section>
        </article>
      </main>
    </div>
  );
};

export default CommunityGuidelines;
