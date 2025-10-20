import { useEffect, useMemo, useState } from "react";
import { MailingListForm } from "./MailingListForm"; // your existing form
import pluggdLogo from "@/assets/pluggdt.png"; // keep your alias path
import { setMeta } from "@/lib/seo"; // keep your alias path

// Optional: set your public launch date here (YYYY-MM-DD)
const LAUNCH_DATE = "2025-11-08"; // tweak as needed

function useCountdown(targetISO: string) {
  const target = useMemo(() => new Date(targetISO).getTime(), [targetISO]);
  const getParts = () => {
    const now = Date.now();
    const diff = Math.max(target - now, 0);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return { days, hours, minutes, seconds };
  };
  const [parts, setParts] = useState(getParts());
  useEffect(() => {
    const id = setInterval(() => setParts(getParts()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return parts;
}

export const ComingSoon = () => {
  useEffect(() => {
    setMeta(
      "Pluggd – Make music. Get paid.",
      "Pluggd brings beats, collabs, releases and payouts into one creator-owned platform. Join the early access list and get launch perks.",
      "/"
    );
  }, []);

  const parts = useCountdown(LAUNCH_DATE);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-background relative overflow-hidden">
      {/* subtle noise */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(black 1px, transparent 1px)", backgroundSize: "3px 3px" }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
        {/* Top bar / logo */}
        <header className="flex items-center justify-center md:justify-between gap-4">
          <img src={pluggdLogo} alt="Pluggd" className="h-10 md:h-12 object-contain" />
          <span className="hidden md:inline-flex items-center gap-2 text-xs text-muted-foreground/80">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Building in public – Launching soon
          </span>
        </header>

        {/* Hero */}
        <section className="mt-12 md:mt-20 text-center">
          <h1 className="text-balance text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">Make music. Get paid.</span>
            <span className="block text-foreground mt-3">Own your path with Pluggd.</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-lg md:text-xl text-muted-foreground">
            One home for your beats, collabs, releases, splits and payouts. No chaos, no gatekeepers.
          </p>

          {/* Incentive + Form */}
          <div className="mx-auto mt-8 flex max-w-xl flex-col items-stretch gap-3">
            <div className="rounded-2xl border bg-card/60 p-4 backdrop-blur">
              <p className="text-sm md:text-base">
                <span className="font-semibold">Join the waitlist</span> and get <span className="font-semibold">early access</span> + <span className="font-semibold">500 free credits</span> on launch.
              </p>
              <div className="mt-4">
                <MailingListForm />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">No spam. 1–2 emails max. Unsubscribe anytime.</p>
            </div>
          </div>

          {/* Countdown */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <TimePill label="Days" value={parts.days} />
            <TimePill label="Hours" value={parts.hours} />
            <TimePill label="Mins" value={parts.minutes} />
            <TimePill label="Secs" value={parts.seconds} />
          </div>

          {/* Social proof strip */}
          <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14l-4-4 1.41-1.41L11 12.17l4.59-4.58L17 9l-6 7z"/></svg>
              Creator-first • Fair splits
            </span>
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 3l9 4.5v9L12 21 3 16.5v-9L12 3zm0 2.18L5 8v8l7 3.82L19 16V8l-7-2.82z"/></svg>
              Built for beats, releases & collabs
            </span>
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
              Secure payouts
            </span>
          </div>
        </section>

        {/* Benefits grid */}
        <section className="mt-16 grid gap-4 md:grid-cols-3">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-2xl border bg-card p-6 text-left shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                {b.icon}
              </div>
              <h3 className="text-lg font-semibold">{b.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </section>

        {/* Social CTA */}
        <section className="mt-10 text-center">
          <p className="text-sm text-muted-foreground">Prefer updates elsewhere?</p>
          <div className="mt-3 flex items-center justify-center gap-3">
            <a href="https://x.com/" target="_blank" rel="noreferrer" className="rounded-full border px-4 py-2 text-sm hover:bg-accent/10">Follow on X</a>
            <a href="https://instagram.com/" target="_blank" rel="noreferrer" className="rounded-full border px-4 py-2 text-sm hover:bg-accent/10">Follow on Instagram</a>
            <a href="/discord" className="rounded-full border px-4 py-2 text-sm hover:bg-accent/10">Join Discord</a>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-16 border-t pt-6 text-center text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Pluggd. All rights reserved.</p>
          <p className="mt-2">We respect your data. Read our <a href="/privacy" className="underline hover:no-underline">Privacy Policy</a>.</p>
        </footer>
      </div>
    </div>
  );
};

function TimePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[70px] rounded-2xl border bg-card/70 px-3 py-2 text-center">
      <div className="text-2xl font-bold tabular-nums leading-none">{String(value).padStart(2, "0")}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

const benefits = [
  {
    title: "Drop-ready releases",
    desc: "Upload once, auto-generate assets and metadata, route to stores when you’re ready.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M19 3H5a2 2 0 00-2 2v14l4-4h12a2 2 0 002-2V5a2 2 0 00-2-2z"/>
      </svg>
    ),
  },
  {
    title: "Collabs & splits",
    desc: "Lock in splits, automate statements and payouts—no spreadsheets or chasing.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm1 9h5a7 7 0 11-6-6v5a1 1 0 001 1z"/>
      </svg>
    ),
  },
  {
    title: "Beat commerce",
    desc: "List beats, offer licenses, run promos, and get paid fast—straight to your wallet.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M3 6h18v2H3V6zm2 4h14v10H5V10zm3 2v6h2v-6H8zm4 0v6h2v-6h-2z"/>
      </svg>
    ),
  },
] as const;
