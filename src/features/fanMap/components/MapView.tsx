import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import { Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import PlugInForm from "./PlugInForm";
import { usePlugs } from "@/features/fanMap/contexts/PlugContext";
import { sanitizeHTML } from "@/features/fanMap/lib/validation";
import { MAP_CONFIG, MAPBOX_CONFIG } from "@/features/fanMap/lib/constants";
import type { Plug } from "@/features/fanMap/contexts/PlugContext";

const MAPBOX_TOKEN = MAPBOX_CONFIG.TOKEN;

// Custom style with brand colors and 3D buildings
const CUSTOM_STYLE = {
  version: 8,
  name: "Pluggd Dark",
  sources: {
    "mapbox": {
      type: "vector",
      url: "mapbox://mapbox.mapbox-streets-v8"
    }
  },
  glyphs: "mapbox://fonts/mapbox/{fontstack}/{range}.pbf",
  layers: [
    // Ocean/water
    {
      id: "background",
      type: "background",
      paint: {
        "background-color": "#0A0A0A"
      }
    },
    {
      id: "water",
      type: "fill",
      source: "mapbox",
      "source-layer": "water",
      paint: {
        "fill-color": "#141418"
      }
    },
    // Landmass
    {
      id: "landcover",
      type: "fill",
      source: "mapbox",
      "source-layer": "landcover",
      paint: {
        "fill-color": "#1A1A1F",
        "fill-opacity": 0.5
      }
    },
    {
      id: "landuse",
      type: "fill",
      source: "mapbox",
      "source-layer": "landuse",
      paint: {
        "fill-color": "#1F1F24"
      }
    },
    // Country borders with brand orange
    {
      id: "admin-1-boundary",
      type: "line",
      source: "mapbox",
      "source-layer": "admin",
      filter: ["==", "admin_level", 1],
      paint: {
        "line-color": "#FF6B35",
        "line-opacity": 0.3,
        "line-width": 1
      }
    },
    {
      id: "admin-0-boundary",
      type: "line",
      source: "mapbox",
      "source-layer": "admin",
      filter: ["==", "admin_level", 0],
      paint: {
        "line-color": "#FF6B35",
        "line-opacity": 0.5,
        "line-width": 2
      }
    },
    // 3D Buildings with orange glow
    {
      id: "building-3d",
      type: "fill-extrusion",
      source: "mapbox",
      "source-layer": "building",
      filter: ["==", "extrude", "true"],
      paint: {
        "fill-extrusion-color": "#2A2A2F",
        "fill-extrusion-height": ["get", "height"],
        "fill-extrusion-base": ["get", "min_height"],
        "fill-extrusion-opacity": 0.8,
        "fill-extrusion-vertical-gradient": true
      }
    },
    // Roads
    {
      id: "road",
      type: "line",
      source: "mapbox",
      "source-layer": "road",
      paint: {
        "line-color": "#333338",
        "line-width": 1
      }
    },
    // Place labels
    {
      id: "place-label",
      type: "symbol",
      source: "mapbox",
      "source-layer": "place_label",
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["DIN Pro Medium", "Arial Unicode MS Regular"],
        "text-size": 12
      },
      paint: {
        "text-color": "#FF6B35",
        "text-halo-color": "#0A0A0A",
        "text-halo-width": 1
      }
    }
  ]
};

interface MapViewProps {
  className?: string;
}

const MapView = ({ className }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const clusterRef = useRef<Supercluster | null>(null);
  const [showPlugInForm, setShowPlugInForm] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [previousPlugCount, setPreviousPlugCount] = useState(0);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [is3DMode, setIs3DMode] = useState(true);
  const { plugs } = usePlugs();

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || isInitialized) return;

    // Check if Mapbox token is available
    if (!MAPBOX_TOKEN) {
      console.error("Mapbox token is missing");
      toast.error("Map configuration error. Please check your environment variables.");
      setIsLoading(false);
      return;
    }

    try {
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: CUSTOM_STYLE as any, // Start with custom style (orange borders)
        center: MAP_CONFIG.INITIAL_CENTER,
        zoom: MAP_CONFIG.INITIAL_ZOOM,
        projection: "globe" as any,
        pitch: MAP_CONFIG.INITIAL_PITCH,
        bearing: MAP_CONFIG.INITIAL_BEARING,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        "top-right"
      );

      // Atmosphere and fog
      map.current.on("style.load", () => {
        map.current?.setFog({
          color: "rgb(10, 10, 10)",
          "high-color": "rgb(20, 20, 30)",
          "horizon-blend": 0.1,
        });
      });

      // Setup layers after map loads
      map.current.on("load", () => {
        if (!map.current) return;
        setIsLoading(false);

        // Add satellite layer (only visible when zoomed in past level 6)
        map.current.addSource("mapbox-satellite", {
          type: "raster",
          url: "mapbox://mapbox.satellite",
          tileSize: 256,
        });

        map.current.addLayer({
          id: "satellite",
          type: "raster",
          source: "mapbox-satellite",
          minzoom: 6, // Only show satellite when zoomed past level 6
          paint: {
            "raster-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              6, 0,    // Transparent at zoom 6
              7, 0.5,  // 50% at zoom 7
              8, 1     // Full opacity at zoom 8+
            ],
          },
        }, "landcover"); // Insert after water layer but before everything else

        // Add heat map source
        map.current.addSource("plugs-heat", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        // Add heat map layer
        map.current.addLayer({
          id: "plugs-heatmap",
          type: "heatmap",
          source: "plugs-heat",
          maxzoom: MAP_CONFIG.HEATMAP_MAX_ZOOM,
          paint: {
            // Increase weight for featured plugs
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "weight"],
              0,
              0,
              10,
              1,
            ],
            // Color ramp from orange to gold
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 0, 0, 0)",
              0.2,
              "rgba(255, 107, 53, 0.2)",
              0.4,
              "rgba(255, 107, 53, 0.5)",
              0.6,
              "rgba(245, 158, 11, 0.7)",
              0.8,
              "rgba(245, 158, 11, 0.9)",
              1,
              "rgba(251, 191, 36, 1)",
            ],
            // Intensity by zoom
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
            // Radius by zoom and weight
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              MAP_CONFIG.HEATMAP_MIN_RADIUS,
              5,
              40,
              15,
              MAP_CONFIG.HEATMAP_MAX_RADIUS,
            ],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 7, 0.8, 15, 0.3],
          },
        });

        // Add 3D extrusion source for tip amounts
        map.current.addSource("plugs-extrusion", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        });

        // Add 3D extrusion layer
        map.current.addLayer({
          id: "plugs-extrusion-3d",
          type: "fill-extrusion",
          source: "plugs-extrusion",
          paint: {
            "fill-extrusion-color": [
              "case",
              ["get", "featured"],
              "#F59E0B", // Gold for featured
              "#FF6B35", // Orange for standard
            ],
            "fill-extrusion-height": ["get", "height"],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.8,
            "fill-extrusion-vertical-gradient": true,
          },
        });
      });

      // Error handling
      map.current.on("error", (e) => {
        console.error("Map error:", e);
        toast.error("Failed to load map. Please check your Mapbox token.");
        setIsLoading(false);
      });

      setIsInitialized(true);

    } catch (error) {
      console.error("Map initialization error:", error);
      toast.error("Failed to initialize map. Please try again.");
      setIsLoading(false);
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
      map.current?.remove();
      map.current = null;
      setIsInitialized(false);
    };
  }, [toast]);

  // Initialize Supercluster and update markers
  useEffect(() => {
    if (!map.current || !isInitialized) return;

    // Convert plugs to GeoJSON features for Supercluster
    const points = plugs.map((plug) => ({
      type: "Feature" as const,
      properties: { ...plug, cluster: false },
      geometry: {
        type: "Point" as const,
        coordinates: [plug.lng, plug.lat],
      },
    }));

    // Initialize Supercluster
    clusterRef.current = new Supercluster({
      radius: MAP_CONFIG.CLUSTER_RADIUS,
      maxZoom: MAP_CONFIG.CLUSTER_MAX_ZOOM,
    });
    clusterRef.current.load(points);

    // Update heat map data
    const heatmapSource = map.current.getSource("plugs-heat") as mapboxgl.GeoJSONSource;
    if (heatmapSource) {
      const heatmapFeatures = plugs.map((plug) => ({
        type: "Feature" as const,
        properties: {
          weight: plug.featured ? (plug.tip || 25) / 5 : 1, // Higher weight for tips
        },
        geometry: {
          type: "Point" as const,
          coordinates: [plug.lng, plug.lat],
        },
      }));

      heatmapSource.setData({
        type: "FeatureCollection",
        features: heatmapFeatures,
      });
    }

    // Update 3D extrusion data (create small circular polygons for each plug)
    const extrusionSource = map.current.getSource("plugs-extrusion") as mapboxgl.GeoJSONSource;
    if (extrusionSource) {
      const extrusionFeatures = plugs.map((plug) => {
        // Calculate height based on tip (or default values)
        const height = plug.featured
          ? (plug.tip || 25) * MAP_CONFIG.EXTRUSION_HEIGHT_PER_DOLLAR
          : MAP_CONFIG.STANDARD_PLUG_HEIGHT;

        // Create a small circle polygon around the point
        const radius = MAP_CONFIG.EXTRUSION_CIRCLE_RADIUS;
        const points = MAP_CONFIG.EXTRUSION_CIRCLE_POINTS;
        const coords = [];

        for (let i = 0; i < points; i++) {
          const angle = (i / points) * 2 * Math.PI;
          coords.push([
            plug.lng + radius * Math.cos(angle),
            plug.lat + radius * Math.sin(angle),
          ]);
        }
        coords.push(coords[0]); // Close the polygon

        return {
          type: "Feature" as const,
          properties: {
            height,
            featured: plug.featured,
            user: plug.user,
            tip: plug.tip,
          },
          geometry: {
            type: "Polygon" as const,
            coordinates: [coords],
          },
        };
      });

      extrusionSource.setData({
        type: "FeatureCollection",
        features: extrusionFeatures,
      });
    }

    const updateMarkers = () => {
      if (!map.current || !clusterRef.current) return;

      const bounds = map.current.getBounds();
      const zoom = Math.floor(map.current.getZoom());

      const clusters = clusterRef.current.getClusters(
        [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
        zoom
      );

      // Get existing marker IDs
      const existingMarkerIds = new Set(markersRef.current.keys());
      const newMarkerIds = new Set<string>();

      clusters.forEach((cluster) => {
        const [lng, lat] = cluster.geometry.coordinates;
        const props = cluster.properties;
        const isCluster = props.cluster;
        const markerId = isCluster ? `cluster-${cluster.id}` : `plug-${props.id}`;

        newMarkerIds.add(markerId);

        // Skip if marker already exists
        if (existingMarkerIds.has(markerId)) {
          existingMarkerIds.delete(markerId);
          return;
        }

        // Create marker element
        const el = document.createElement("div");
        el.style.cursor = "pointer";
        el.style.transition = "all 0.3s ease";

        if (isCluster) {
          // Cluster marker
          const count = props.point_count;
          const size = count < 10 ? 40 : count < 50 ? 50 : 60;

          el.className = "cluster-marker";
          el.style.width = `${size}px`;
          el.style.height = `${size}px`;
          el.style.borderRadius = "50%";
          el.style.backgroundColor = "rgba(255, 107, 53, 0.8)";
          el.style.border = "3px solid hsl(16, 100%, 70%)";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.fontWeight = "bold";
          el.style.color = "white";
          el.style.fontSize = "16px";
          el.style.boxShadow = "0 0 20px rgba(255, 107, 53, 0.6)";
          el.textContent = count.toString();

          const marker = new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .addTo(map.current!);

          marker.getElement().addEventListener("click", () => {
            if (!clusterRef.current) return;
            const expansionZoom = Math.min(
              clusterRef.current.getClusterExpansionZoom(cluster.id as number),
              20
            );
            map.current?.easeTo({
              center: [lng, lat],
              zoom: expansionZoom,
              duration: MAP_CONFIG.CLUSTER_ZOOM_DURATION,
            });
          });

          markersRef.current.set(markerId, marker);
        } else {
          // Individual plug marker with animation
          const plug = props as Plug;
          const isNewPlug = plugs.length > previousPlugCount && plug.id === plugs[plugs.length - 1].id;

          el.className = plug.featured ? "featured-plug-marker" : "plug-marker";
          el.style.width = `${plug.featured ? MAP_CONFIG.FEATURED_MARKER_SIZE : MAP_CONFIG.STANDARD_MARKER_SIZE}px`;
          el.style.height = `${plug.featured ? MAP_CONFIG.FEATURED_MARKER_SIZE : MAP_CONFIG.STANDARD_MARKER_SIZE}px`;
          el.style.borderRadius = "50%";
          el.style.backgroundColor = plug.featured ? "hsl(45, 100%, 60%)" : "hsl(16, 100%, 60%)";
          el.style.border = plug.featured ? "3px solid hsl(45, 100%, 70%)" : "2px solid hsl(16, 100%, 70%)";
          el.style.boxShadow = plug.featured
            ? "0 0 20px hsl(45, 100%, 60%)"
            : "0 0 10px hsl(16, 100%, 60%)";

          // Animated arrival for new plugs
          if (isNewPlug) {
            el.style.animation = `plug-drop ${MAP_CONFIG.PLUG_DROP_DURATION}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
            setTimeout(() => {
              el.style.animation = plug.featured ? "glow-pulse 2s ease-in-out infinite" : "none";
            }, MAP_CONFIG.PLUG_DROP_DURATION);
          } else {
            el.style.animation = plug.featured ? "glow-pulse 2s ease-in-out infinite" : "none";
          }

          // Create popup with sanitized content
          const popupContent = document.createElement('div');
          popupContent.style.cssText = 'color: #0A0A0A; font-family: system-ui;';

          const userName = document.createElement('strong');
          userName.style.color = plug.featured ? '#F59E0B' : '#FF6B35';
          userName.textContent = plug.user;
          popupContent.appendChild(userName);

          if (plug.featured) {
            popupContent.appendChild(document.createTextNode(' ⭐'));
          }

          popupContent.appendChild(document.createElement('br'));

          const location = document.createElement('small');
          location.textContent = `${plug.city}, ${plug.country}`;
          popupContent.appendChild(location);

          if (plug.message) {
            popupContent.appendChild(document.createElement('br'));
            const message = document.createElement('em');
            message.textContent = `"${plug.message}"`;
            popupContent.appendChild(message);
          }

          if (plug.tip) {
            popupContent.appendChild(document.createElement('br'));
            const tip = document.createElement('strong');
            tip.textContent = `Tipped $${plug.tip}`;
            popupContent.appendChild(tip);
          }

          const popup = new mapboxgl.Popup({ offset: 25 }).setDOMContent(popupContent);

          const marker = new mapboxgl.Marker(el)
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map.current!);

          // Add ARIA labels for accessibility
          const markerElement = marker.getElement();
          markerElement.setAttribute('role', 'button');
          markerElement.setAttribute('aria-label', `Plug from ${plug.user} in ${plug.city}, ${plug.country}`);
          markerElement.setAttribute('tabindex', '0');

          // Only fly to marker if we're zoomed far out (to avoid re-clustering)
          // Otherwise, just let the popup show naturally
          markerElement.addEventListener("click", (e) => {
            const currentZoom = map.current?.getZoom() || 0;

            // Only fly-to if zoomed out (zoom < 10), otherwise just show popup
            if (currentZoom < 10) {
              map.current?.flyTo({
                center: [lng, lat],
                zoom: 14, // Zoom in closer (was 12)
                pitch: MAP_CONFIG.FLY_TO_PITCH,
                bearing: 0,
                duration: MAP_CONFIG.FLY_TO_DURATION,
                essential: true,
              });
            }
            // If already zoomed in, clicking will just toggle the popup (default behavior)
          });

          // Keyboard accessibility
          markerElement.addEventListener("keydown", (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              markerElement.click();
            }
          });

          markersRef.current.set(markerId, marker);
        }
      });

      // Remove markers that are no longer visible
      existingMarkerIds.forEach((id) => {
        const marker = markersRef.current.get(id);
        marker?.remove();
        markersRef.current.delete(id);
      });
    };

    updateMarkers();
    setPreviousPlugCount(plugs.length);

    map.current.on("move", updateMarkers);
    map.current.on("zoom", updateMarkers);

    return () => {
      map.current?.off("move", updateMarkers);
      map.current?.off("zoom", updateMarkers);
    };
  }, [plugs, isInitialized, previousPlugCount]);

  // Toggle heatmap visibility
  const toggleHeatmap = () => {
    if (!map.current) return;
    const newVisibility = !showHeatmap;
    setShowHeatmap(newVisibility);
    map.current.setLayoutProperty(
      "plugs-heatmap",
      "visibility",
      newVisibility ? "visible" : "none"
    );
  };

  // Toggle 2D/3D mode
  const toggle3DMode = () => {
    if (!map.current) return;
    const currentProjection = map.current.getProjection().name;
    const newMode = currentProjection === 'globe';

    setIs3DMode(!newMode);

    // Switch projection between globe (3D) and mercator (2D)
    if (currentProjection === 'globe') {
      map.current.setProjection('mercator' as any);
      // Optionally adjust view for 2D
      map.current.easeTo({
        pitch: 0,
        bearing: 0,
        duration: 1000,
      });
    } else {
      map.current.setProjection('globe' as any);
      // Optionally adjust view for 3D globe
      map.current.easeTo({
        pitch: MAP_CONFIG.INITIAL_PITCH,
        duration: 1000,
      });
    }
  };

  return (
    <div className={`relative bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-card/95 backdrop-blur border-b border-border">
        <div>
          <h2 className="text-lg font-bold text-foreground">Pluggd Wall Map</h2>
          <p className="text-xs text-muted-foreground">Explore fan support worldwide</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggle3DMode}
            className="text-xs"
            aria-label={is3DMode ? "Switch to 2D mode" : "Switch to 3D mode"}
            disabled={isLoading}
          >
            {is3DMode ? "2D" : "3D"} Mode
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleHeatmap}
            className="text-xs"
            aria-label={showHeatmap ? "Hide heat map layer" : "Show heat map layer"}
            disabled={isLoading}
          >
            {showHeatmap ? "Hide" : "Show"} Heat Map
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowPlugInForm(true)}
            className="bg-primary hover:bg-primary/90"
            aria-label="Open plug in form to add your location"
          >
            <Zap className="w-4 h-4 mr-2" />
            Plug In
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-card/80 backdrop-blur">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full min-h-[480px]" role="region" aria-label="Interactive world map showing fan plugs" />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur p-4 rounded-lg border border-border space-y-2 max-w-[220px]">
        <div className="text-xs font-semibold text-primary mb-2">Map Legend</div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary flex-shrink-0" style={{ boxShadow: "0 0 10px hsl(var(--plug-orange))" }} />
          <span className="text-xs text-foreground">Standard Plug</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[hsl(45,100%,60%)] flex-shrink-0" style={{ boxShadow: "0 0 20px hsl(45, 100%, 60%)", animation: "glow-pulse 2s ease-in-out infinite" }} />
          <span className="text-xs text-foreground">Featured Plug</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/80 border-2 border-primary flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ boxShadow: "0 0 20px rgba(255, 107, 53, 0.6)" }}>
            12
          </div>
          <span className="text-xs text-foreground">Cluster (click to expand)</span>
        </div>
        <div className="border-t border-border/50 pt-2 mt-2">
          <div className="text-xs text-muted-foreground mb-1">3D Features:</div>
          <div className="text-xs text-foreground">• Heat map shows support density</div>
          <div className="text-xs text-foreground">• 3D columns = tip amounts</div>
          <div className="text-xs text-foreground">• Click markers to fly closer</div>
        </div>
      </div>

      {showPlugInForm && (
        <PlugInForm onClose={() => setShowPlugInForm(false)} />
      )}
    </div>
  );
};

export default MapView;
