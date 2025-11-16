import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  isValidCoordinates,
  isValidUserName,
  isValidMessage,
  isValidTipAmount,
  sanitizeHTML,
} from "@/features/fanMap/lib/validation";

export interface Plug {
  id: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  user: string;
  featured: boolean;
  message?: string;
  tip?: number;
  timestamp: string;
  creatorId?: string;
}

type PlugInput = Omit<Plug, "id" | "timestamp" | "creatorId" | "featured">;

interface PlugContextType {
  plugs: Plug[];
  addPlug: (plug: PlugInput) => Promise<boolean>;
  totalPlugs: number;
  countriesCount: number;
  featuredCount: number;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

interface FanMapDbPlug {
  id: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
  display_name: string;
  message: string | null;
  tip_amount: number | null;
  is_featured: boolean;
  created_at: string;
  creator_id: string | null;
}

const PlugContext = createContext<PlugContextType | undefined>(undefined);

const mapDbPlug = (row: FanMapDbPlug): Plug => ({
  id: row.id,
  lat: row.lat,
  lng: row.lng,
  city: row.city,
  country: row.country,
  user: row.display_name,
  message: row.message ?? undefined,
  tip: row.tip_amount ?? undefined,
  featured: row.is_featured,
  timestamp: row.created_at,
  creatorId: row.creator_id ?? undefined,
});

export const PlugProvider = ({
  children,
  creatorId = null,
}: {
  children: ReactNode;
  creatorId?: string | null;
}) => {
  const [plugs, setPlugs] = useState<Plug[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPlugs = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_fan_map_plugs", {
        p_creator_id: creatorId ?? null,
      });

      if (error) {
        throw error;
      }

      const mapped = (data ?? []).map(mapDbPlug);
      setPlugs(mapped);
    } catch (error) {
      console.error("Failed to load fan map plugs:", error);
      toast.error("Couldn't load fan map data");
    } finally {
      setIsLoading(false);
    }
  }, [creatorId]);

  useEffect(() => {
    fetchPlugs();
  }, [fetchPlugs]);

  const addPlug = async (newPlug: PlugInput): Promise<boolean> => {
    try {
      if (!isValidCoordinates(newPlug.lat, newPlug.lng)) {
        toast.error("Invalid coordinates");
        return false;
      }

      const userValidation = isValidUserName(newPlug.user);
      if (!userValidation.valid) {
        toast.error(userValidation.error || "Invalid name");
        return false;
      }

      const messageValidation = isValidMessage(newPlug.message || "");
      if (!messageValidation.valid) {
        toast.error(messageValidation.error || "Invalid message");
        return false;
      }

      if (!isValidTipAmount(newPlug.tip)) {
        toast.error("Invalid tip amount");
        return false;
      }

      const { data, error } = await supabase.rpc("create_fan_map_plug", {
        p_display_name: sanitizeHTML(newPlug.user.trim()),
        p_city: sanitizeHTML(newPlug.city.trim()),
        p_country: sanitizeHTML(newPlug.country.trim()),
        p_lat: newPlug.lat,
        p_lng: newPlug.lng,
        p_message: newPlug.message ? sanitizeHTML(newPlug.message.trim()) : null,
        p_tip_amount: newPlug.tip ?? null,
        p_creator_id: creatorId ?? null,
      });

      if (error) {
        if (error.message === "not_authenticated") {
          toast.error("Please sign in to add a plug");
          return false;
        }
        throw error;
      }

      if (!data) {
        throw new Error("No data returned from create_fan_map_plug");
      }

      const plug = mapDbPlug(data as FanMapDbPlug);
      setPlugs((prev) => [...prev, plug]);
      return true;
    } catch (error) {
      console.error("Error adding plug:", error);
      toast.error("Failed to add plug");
      return false;
    }
  };

  const uniqueCountries = new Set(plugs.map((p) => p.country)).size;
  const featuredPlugs = plugs.filter((p) => p.featured).length;

  return (
    <PlugContext.Provider
      value={{
        plugs,
        addPlug,
        totalPlugs: plugs.length,
        countriesCount: uniqueCountries,
        featuredCount: featuredPlugs,
        isLoading,
        refresh: fetchPlugs,
      }}
    >
      {children}
    </PlugContext.Provider>
  );
};

export const usePlugs = () => {
  const context = useContext(PlugContext);
  if (!context) {
    throw new Error("usePlugs must be used within PlugProvider");
  }
  return context;
};
