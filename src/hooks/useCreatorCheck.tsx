import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useCreatorCheck = () => {
  const [isCreator, setIsCreator] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkCreatorStatus = async () => {
      if (!user) {
        setIsCreator(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('is_creator')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking creator status:', error);
          setIsCreator(false);
        } else {
          setIsCreator(data?.is_creator || false);
        }
      } catch (error) {
        console.error('Error in creator check:', error);
        setIsCreator(false);
      } finally {
        setLoading(false);
      }
    };

    checkCreatorStatus();
  }, [user]);

  return { isCreator, loading };
};