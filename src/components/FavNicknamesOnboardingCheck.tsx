import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFavNicknames } from "@/hooks/useFavNicknames";
import { FavNicknamesFirstRun } from "./FavNicknamesFirstRun";

interface FavNicknamesOnboardingCheckProps {
  children: React.ReactNode;
}

export const FavNicknamesOnboardingCheck = ({ children }: FavNicknamesOnboardingCheckProps) => {
  const { user } = useAuth();
  const { hasSetupCompleted } = useFavNicknames();
  const [showFirstRun, setShowFirstRun] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSetupStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const setupCompleted = await hasSetupCompleted();
        
        // Only show first-run if:
        // 1. User is authenticated
        // 2. Setup has not been completed
        // 3. Regular onboarding has been completed (to avoid conflicts)
        const regularOnboardingCompleted = localStorage.getItem('onboarding_completed') === 'true';
        
        if (!setupCompleted && regularOnboardingCompleted) {
          setShowFirstRun(true);
        }
      } catch (error) {
        console.error('Error checking FAV nicknames setup status:', error);
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to avoid conflicts with regular onboarding
    const timer = setTimeout(checkSetupStatus, 1000);
    
    return () => clearTimeout(timer);
  }, [user, hasSetupCompleted]);

  const handleComplete = () => {
    setShowFirstRun(false);
  };

  if (loading) {
    return <>{children}</>;
  }

  if (showFirstRun) {
    return <FavNicknamesFirstRun onComplete={handleComplete} />;
  }

  return <>{children}</>;
};

export default FavNicknamesOnboardingCheck;