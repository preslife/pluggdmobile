import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCreatorCheck } from "@/hooks/useCreatorCheck";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { LoadingSkeleton } from "./LoadingSkeleton";

interface ProtectedCreatorRouteProps {
  children: React.ReactNode;
}

export const ProtectedCreatorRoute = ({ children }: ProtectedCreatorRouteProps) => {
  const { user } = useAuth();
  const { isCreator, loading } = useCreatorCheck();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) {
      if (!isCreator) {
        toast({
          title: "Creator Access Required",
          description: "Creator tools are available after you enable Creator in Settings.",
          variant: "destructive"
        });
        navigate('/dashboard');
      }
    }
  }, [isCreator, loading, user, navigate, toast]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (!user || !isCreator) {
    return null;
  }

  return <>{children}</>;
};