import { useAuth } from "@/hooks/useAuth";
import { EventManagement } from "@/components/EventManagement";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Shield } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminEvents() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!data && !error);
    };

    checkAdminRole();
  }, [user]);

  if (!user || isAdmin === false) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAdmin === null) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Checking permissions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin - Events Management</title>
        <meta name="description" content="Manage community events, workshops, and live sessions. Admin interface for event creation and management." />
      </Helmet>
      
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-primary" />
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Events Management</h1>
            <p className="text-muted-foreground">
              Create and manage community events, workshops, and live sessions
            </p>
          </div>
        </div>

        {/* Event Management */}
        <Card>
          <CardHeader>
            <CardTitle>Event Management Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <EventManagement />
          </CardContent>
        </Card>
      </div>
    </>
  );
}