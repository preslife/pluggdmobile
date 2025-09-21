import { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getUserByUsername } from '@/utils/userLookup';
import { WorldClassCreatorPage } from './creator/WorldClassCreatorPage';
import UserProfile from '@/pages/UserProfile';
import NotFound from '@/pages/NotFound';
import { Loader2 } from 'lucide-react';

interface UsernameBasedProfileProps {
  requireCreator?: boolean;
}

/**
 * Component that handles username-based profile routing
 * Used for both /u/[username] and /creator/[username] routes
 */
export const UsernameBasedProfile = ({ requireCreator = false }: UsernameBasedProfileProps) => {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      if (!username) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const profile = await getUserByUsername(username);
        
        if (!profile) {
          setNotFound(true);
          return;
        }

        // If this is a creator route but user is not a creator, show 404
        if (requireCreator && !profile.is_creator) {
          setNotFound(true);
          return;
        }

        setUserProfile(profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username, requireCreator]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (notFound || !userProfile) {
    return <NotFound />;
  }

  // Render the appropriate component directly
  if (requireCreator) {
    return <WorldClassCreatorPage />;
  }

  return <UserProfile />;
};