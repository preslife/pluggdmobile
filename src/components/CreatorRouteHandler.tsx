import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserById } from '@/utils/userLookup';
import { UsernameBasedProfile } from './UsernameBasedProfile';
import { Loader2 } from 'lucide-react';

/**
 * Handles both legacy creator ID routes and new username routes
 * Automatically redirects legacy routes to username-based routes
 */
export const CreatorRouteHandler = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If the parameter looks like a UUID (legacy route), redirect to username
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (username && uuidRegex.test(username)) {
      setLoading(true);
      handleLegacyRedirect(username);
    }
  }, [username, navigate]);

  const handleLegacyRedirect = async (userId: string) => {
    try {
      const profile = await getUserById(userId);
      
      if (!profile) {
        navigate('/404', { replace: true });
        return;
      }

      // If no username, fallback to user profile
      if (!profile.username) {
        navigate(`/user/${userId}`, { replace: true });
        return;
      }

      // If not a creator, redirect to regular user profile
      if (!profile.is_creator) {
        navigate(`/u/${profile.username}`, { replace: true });
        return;
      }

      // Redirect to username-based creator route
      navigate(`/creator/${profile.username}`, { replace: true });
    } catch (error) {
      console.error('Error redirecting legacy creator route:', error);
      navigate('/404', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  // If not a UUID, treat as username and render normally
  return <UsernameBasedProfile requireCreator={true} />;
};