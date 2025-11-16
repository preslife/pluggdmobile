import { useState, useCallback, useRef } from "react";
import { MapPin, MessageSquare, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePlugs } from "@/features/fanMap/contexts/PlugContext";
import { debounce } from "@/features/fanMap/lib/validation";
import { MAPBOX_CONFIG, VALIDATION, TIP_AMOUNTS } from "@/features/fanMap/lib/constants";

const MAPBOX_TOKEN = MAPBOX_CONFIG.TOKEN;

interface PlugInFormProps {
  onClose: () => void;
}

interface LocationSuggestion {
  place_name: string;
  center: [number, number];
  context?: Array<{ id: string; text: string }>;
}

const PlugInForm = ({ onClose }: PlugInFormProps) => {
  const [location, setLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [message, setMessage] = useState("");
  const [tipAmount, setTipAmount] = useState<number | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userName, setUserName] = useState("");
  const { addPlug } = usePlugs();

  // Debounced search function
  const handleLocationSearch = async (query: string) => {
    if (!query.trim()) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!MAPBOX_TOKEN) {
      toast.error("Map configuration error");
      return;
    }

    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${MAPBOX_TOKEN}&types=${MAPBOX_CONFIG.GEOCODING_TYPES}&language=${MAPBOX_CONFIG.GEOCODING_LANGUAGE}&limit=${MAPBOX_CONFIG.GEOCODING_LIMIT}`
      );

      if (!response.ok) {
        throw new Error("Failed to search location");
      }

      const data = await response.json();
      setLocationSuggestions(data.features || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Location search error:", error);
      toast.error("Failed to search location");
    }
  };

  // Create debounced version of search
  const debouncedSearch = useRef(
    debounce(handleLocationSearch, VALIDATION.LOCATION_SEARCH_DEBOUNCE)
  ).current;

  const handleLocationSelect = (suggestion: LocationSuggestion) => {
    setLocation(suggestion.place_name);
    setLocationCoords({ lat: suggestion.center[1], lng: suggestion.center[0] });
    setShowSuggestions(false);
  };

  const handleFindMe = () => {
    setIsLoadingLocation(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser. Please enter your location manually.");
      setIsLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationCoords({ lat: latitude, lng: longitude });

        try {
          const response = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&language=${MAPBOX_CONFIG.GEOCODING_LANGUAGE}`
          );

          if (!response.ok) {
            throw new Error("Failed to reverse geocode");
          }

          const data = await response.json();

          if (data.features && data.features.length > 0) {
            setLocation(data.features[0].place_name);
            toast.success("Location detected!");
          } else {
            toast.warning("Location detected but couldn't determine address. You can search manually.");
          }
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          toast.warning("Coordinates set, but couldn't get location name. Please search for your city.");
        }

        setIsLoadingLocation(false);
      },
      (error) => {
        let errorMessage = "Unable to get your location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please allow location access or enter manually.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable. Please enter manually.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again or enter manually.";
            break;
        }

        toast.error(errorMessage);
        console.error("Geolocation error:", error);
        setIsLoadingLocation(false);
      },
      {
        timeout: 10000, // 10 second timeout
        enableHighAccuracy: true,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Validation
      if (!locationCoords) {
        toast.error("Please select a valid location");
        return;
      }

      if (!location.trim()) {
        toast.error("Please enter your location");
        return;
      }

      if (!userName.trim()) {
        toast.error("Please enter your name");
        return;
      }

      if (userName.trim().length < VALIDATION.USER_NAME_MIN_LENGTH) {
        toast.error(`Name must be at least ${VALIDATION.USER_NAME_MIN_LENGTH} characters`);
        return;
      }

      if (message.length > VALIDATION.MESSAGE_MAX_LENGTH) {
        toast.error(`Message must be less than ${VALIDATION.MESSAGE_MAX_LENGTH} characters`);
        return;
      }

      const locationParts = location.split(", ");
      const city = locationParts[0] || location;
      const country = locationParts[locationParts.length - 1] || "Unknown";

      const success = await addPlug({
        lat: locationCoords.lat,
        lng: locationCoords.lng,
        city,
        country,
        user: userName.trim(),
        message: message.trim() || undefined,
        tip: tipAmount ?? undefined,
      });

      if (success) {
        toast.success("Successfully plugged in!", {
          description: tipAmount
            ? `Your featured plug with $${tipAmount} tip is now on the map!`
            : "Your plug is now on the map!",
        });
        onClose();
      }
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("Failed to add plug. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-primary/20 rounded-lg">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            Plug In to the Wall
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <label htmlFor="user-name" className="text-sm font-medium text-foreground">
              Your Name
            </label>
            <input
              id="user-name"
              type="text"
              required
              placeholder="e.g., Sarah K."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              minLength={VALIDATION.USER_NAME_MIN_LENGTH}
              maxLength={VALIDATION.USER_NAME_MAX_LENGTH}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              aria-required="true"
            />
          </div>

          {/* Location */}
          <div className="space-y-2 relative">
            <label htmlFor="location-input" className="text-sm font-medium text-foreground">
              Your Location
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="location-input"
                  type="text"
                  required
                  placeholder="Search for your city..."
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value);
                    debouncedSearch(e.target.value);
                  }}
                  onFocus={() => locationSuggestions.length > 0 && setShowSuggestions(true)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  aria-required="true"
                  aria-autocomplete="list"
                  aria-controls="location-suggestions"
                  aria-expanded={showSuggestions && locationSuggestions.length > 0}
                />
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div id="location-suggestions" role="listbox" className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {locationSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        type="button"
                        role="option"
                        onClick={() => handleLocationSelect(suggestion)}
                        className="w-full text-left px-3 py-2 hover:bg-secondary text-sm transition-colors"
                        aria-selected={false}
                      >
                        {suggestion.place_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleFindMe}
                disabled={isLoadingLocation || isSubmitting}
                title="Use my current location"
                aria-label="Detect my current location automatically"
              >
                {isLoadingLocation ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Search for your city or use "Find Me" button
            </p>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <label htmlFor="message-input" className="text-sm font-medium text-foreground flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Message (Optional)
            </label>
            <textarea
              id="message-input"
              placeholder="Send a message of support..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={VALIDATION.MESSAGE_MAX_LENGTH}
              disabled={isSubmitting}
              className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-50"
              aria-label="Optional support message"
            />
            <p className="text-xs text-muted-foreground text-right">
              {message.length}/{VALIDATION.MESSAGE_MAX_LENGTH}
            </p>
          </div>

          {/* Note: Tip/Payment functionality will be handled in main Pluggd platform */}
          {/* If you want to enable tipping for testing, uncomment below and set tipAmount */}
          {/* <div className="p-3 bg-muted rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> Payment and featured placement will be available when integrated with the Pluggd platform.
            </p>
          </div> */}

          {/* Submit */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !locationCoords}
              className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50"
              aria-label="Submit plug to add your location to the map"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Plug In"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PlugInForm;
