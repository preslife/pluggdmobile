import { MapPin, Users, Globe, Zap } from "lucide-react";
import { usePlugs } from "@/features/fanMap/contexts/PlugContext";

const PluggdWall = () => {
  const { totalPlugs, countriesCount, featuredCount } = usePlugs();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card/90 p-8 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/20 rounded-xl animate-glow-pulse">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Pluggd Wall Stats</h2>
            <p className="text-sm text-muted-foreground">Real-time community metrics</p>
          </div>
        </div>
        <Globe className="w-8 h-8 text-primary/40" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="text-center p-4 bg-secondary/40 rounded-lg border border-border/50">
          <MapPin className="w-5 h-5 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{totalPlugs.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Total Plugs</div>
        </div>

        <div className="text-center p-4 bg-secondary/40 rounded-lg border border-border/50">
          <Globe className="w-5 h-5 text-primary mx-auto mb-2" />
          <div className="text-2xl font-bold text-foreground">{countriesCount}</div>
          <div className="text-xs text-muted-foreground">Countries</div>
        </div>

        <div className="text-center p-4 bg-secondary/40 rounded-lg border border-border/50">
          <Users className="w-5 h-5 text-accent mx-auto mb-2 animate-glow-pulse" />
          <div className="text-2xl font-bold text-foreground">{featuredCount}</div>
          <div className="text-xs text-muted-foreground">Featured</div>
        </div>
      </div>
    </div>
  );
};

export default PluggdWall;
