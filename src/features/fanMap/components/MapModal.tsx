import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { X, Zap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import PlugInForm from "./PlugInForm";
import { useToast } from "@/hooks/use-toast";
import { usePlugs } from "@/features/fanMap/contexts/PlugContext";
import { MAPBOX_CONFIG } from "@/features/fanMap/lib/constants";

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MapModal = ({ isOpen, onClose }: MapModalProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [showPlugInForm, setShowPlugInForm] = useState(false);
  const [, setMapError] = useState("");
  const { toast } = useToast();
  const { plugs } = usePlugs();
  const mapboxToken = MAPBOX_CONFIG.TOKEN;

  useEffect(() => {
    if (!isOpen || !mapContainer.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      setMapError("");

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [0, 20],
        zoom: 1.5,
        projection: "globe" as any,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "top-right"
      );

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Add plugs as markers
      plugs.forEach((plug) => {
        const el = document.createElement("div");
        el.className = plug.featured ? "featured-plug-marker" : "plug-marker";
        el.style.width = plug.featured ? "24px" : "16px";
        el.style.height = plug.featured ? "24px" : "16px";
        el.style.borderRadius = "50%";
        el.style.backgroundColor = plug.featured ? "hsl(45, 100%, 60%)" : "hsl(16, 100%, 60%)";
        el.style.border = plug.featured ? "3px solid hsl(45, 100%, 70%)" : "2px solid hsl(16, 100%, 70%)";
        el.style.cursor = "pointer";
        el.style.boxShadow = plug.featured 
          ? "0 0 20px hsl(45, 100%, 60%)"
          : "0 0 10px hsl(16, 100%, 60%)";
        el.style.animation = plug.featured ? "glow-pulse 2s ease-in-out infinite" : "none";

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
          <div style="color: #0A0A0A; font-family: system-ui;">
            <strong style="color: ${plug.featured ? '#F59E0B' : '#FF6B35'};">${plug.user}</strong>
            ${plug.featured ? ' ⭐' : ''}
            <br/>
            <small>${plug.city}, ${plug.country}</small>
            ${plug.message ? `<br/><em>"${plug.message}"</em>` : ''}
            ${plug.tip ? `<br/><strong>Tipped $${plug.tip}</strong>` : ''}
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([plug.lng, plug.lat])
          .setPopup(popup)
          .addTo(map.current!);
        
        markersRef.current.push(marker);
      });

      // Atmosphere and fog
      map.current.on("style.load", () => {
        map.current?.setFog({
          color: "rgb(10, 10, 10)",
          "high-color": "rgb(20, 20, 30)",
          "horizon-blend": 0.1,
        });
      });

      // Error handling
      map.current.on("error", (e) => {
        console.error("Map error:", e);
        setMapError("Failed to load map. Please check your token.");
        toast({
          variant: "destructive",
          title: "Map Error",
          description: "Failed to load map. Please check your Mapbox token.",
        });
      });

    } catch (error) {
      console.error("Map initialization error:", error);
      setMapError("Failed to initialize map.");
      toast({
        variant: "destructive",
        title: "Map Error",
        description: "Failed to initialize map. Please try again.",
      });
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [isOpen, mapboxToken, toast, plugs]);

  if (!mapboxToken) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Map configuration needed</DialogTitle>
          <DialogDescription>
            Set <code>VITE_MAPBOX_TOKEN</code> in your environment to enable the fan map.
          </DialogDescription>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!max-w-[98vw] !h-[98vh] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Pluggd Wall Map</DialogTitle>
        <DialogDescription className="sr-only">
          Interactive map showing fan support from around the world
        </DialogDescription>
        <div className="relative w-full h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-card/95 backdrop-blur z-10">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-secondary"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div>
                <h2 className="text-lg font-bold text-foreground">Pluggd Wall Map</h2>
                <p className="text-xs text-muted-foreground">Explore fan support worldwide</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowPlugInForm(true)}
                className="bg-primary hover:bg-primary/90"
              >
                <Zap className="w-4 h-4 mr-2" />
                Plug In
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-secondary"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Map Container */}
          <div ref={mapContainer} className="flex-1 w-full" />

          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur p-4 rounded-lg border border-border space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary" style={{ boxShadow: "0 0 10px hsl(var(--plug-orange))" }} />
              <span className="text-sm text-foreground">Standard Plug</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-[hsl(45,100%,60%)]" style={{ boxShadow: "0 0 20px hsl(45, 100%, 60%)", animation: "glow-pulse 2s ease-in-out infinite" }} />
              <span className="text-sm text-foreground">Featured Plug (Tipped)</span>
            </div>
          </div>
        </div>

        {showPlugInForm && (
          <PlugInForm onClose={() => setShowPlugInForm(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MapModal;
