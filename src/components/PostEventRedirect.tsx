import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface PostEventRedirectProps {
  eventStatus: string;
  eventType: 'session' | 'challenge' | 'contest';
  eventId: string;
}

const PostEventRedirect = ({ eventStatus, eventType, eventId }: PostEventRedirectProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (eventStatus === 'ended') {
      const timer = setTimeout(() => {
        if (!user) {
          // Redirect non-authenticated users to signup with context
          navigate(`/auth?context=${eventType}&id=${eventId}&message=Sign up to join more events like this!`);
        } else {
          // Redirect authenticated users to relevant pages
          switch (eventType) {
            case 'session':
              toast({
                title: 'Session Ended',
                description: 'Redirecting to community hub...',
              });
              navigate('/community');
              break;
            case 'challenge':
              navigate('/gamification');
              break;
            case 'contest':
              navigate('/live/battles');
              break;
            default:
              navigate('/');
          }
        }
      }, 3000); // 3 second delay for users to see the ended status

      return () => clearTimeout(timer);
    }
  }, [eventStatus, eventType, eventId, user, navigate, toast]);

  if (eventStatus === 'ended') {
    return (
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-card p-6 rounded-lg border max-w-md text-center">
          <h3 className="text-lg font-bold mb-2">Event Ended</h3>
          <p className="text-muted-foreground mb-4">
            {user 
              ? 'Redirecting you to continue the experience...' 
              : 'Sign up to join more amazing events like this!'
            }
          </p>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return null;
};

export default PostEventRedirect;