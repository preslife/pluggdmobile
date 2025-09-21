import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUserById } from '@/utils/userLookup';
import { Loader2 } from 'lucide-react';

/**
 * Component that handles legacy /creator/{id} routes and redirects to username-based routes
 */
export const LegacyCreatorRedirect = () => {
  const { creatorId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const redirectToUsername = async () => {
      if (!creatorId) {
        navigate('/404', { replace: true });
        return;
      }

      try {
        const profile = await getUserById(creatorId);
        
        if (!profile) {
          navigate('/404', { replace: true });
          return;
        }

        // If no username, fallback to user ID route
        if (!profile.username) {
          navigate(`/user/${creatorId}`, { replace: true });
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

    redirectToUsername();
  }, [creatorId, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
};