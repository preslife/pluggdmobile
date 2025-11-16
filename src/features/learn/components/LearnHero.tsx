import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, BookOpenCheck, ShieldCheck, LineChart } from 'lucide-react';

export const LearnHero = () => {
  return (
    <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[#120c1f] via-[#1c0f2b] to-[#190520] px-6 py-12 md:px-10 md:py-16 text-white shadow-2xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(159,122,234,0.2),_transparent_50%)]" />
      <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-sm font-medium text-white/80 backdrop-blur">
            <Sparkles className="h-4 w-4 text-amber-300" />
            Academy Beta Live
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            Learn, launch, and level up inside Pluggd.
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Courses, live sessions, and assessments powered by real creator data. No mock screens—everything here hooks into the same Supabase stack that runs Pluggd.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="lg" asChild className="bg-white text-primary hover:bg-white/90">
              <a href="#catalog">Explore catalog</a>
            </Button>
            <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10">
              View onboarding plan
            </Button>
          </div>
        </div>
        <div className="grid w-full max-w-sm gap-4 text-sm text-white/80">
          <HeroStat icon={<BookOpenCheck className="h-4 w-4" />} title="Courses wired to auth" description="Single sign-on with creator or fan sessions—no separate LMS login." />
          <HeroStat icon={<ShieldCheck className="h-4 w-4" />} title="Entitlements ready" description="Respect memberships + purchases via Supabase policies." />
          <HeroStat icon={<LineChart className="h-4 w-4" />} title="Observability baked in" description="Checkout-style metrics for every lesson, quiz, and completion." />
        </div>
      </div>
    </section>
  );
};

const HeroStat = ({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) => (
  <div className="rounded-2xl border border-white/20 bg-white/5 p-4 backdrop-blur">
    <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
      <Badge variant="secondary" className="bg-white/10 text-white">
        {icon}
      </Badge>
      {title}
    </div>
    <p className="text-xs text-white/80">{description}</p>
  </div>
);
