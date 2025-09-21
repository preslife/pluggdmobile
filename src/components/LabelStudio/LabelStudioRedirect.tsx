import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import CreateLabelForm from "@/components/LabelStudio/CreateLabelForm";

export default function LabelStudioRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasMembership, setHasMembership] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkMembership = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { count, error } = await supabase
        .from("label_members")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!isMounted) return;
      if (error) {
        console.error("Label membership check failed", error);
        setHasMembership(false);
      } else {
        setHasMembership((count || 0) > 0);
      }
      setLoading(false);
    };

    checkMembership();
    return () => {
      isMounted = false;
    };
  }, [user]);

  if (loading) return null;

  if (hasMembership) {
    return <Navigate to="/studio/label/roster" replace />;
  }

  // No membership yet → show the create form.
  return (
    <CreateLabelForm
      onCreated={() => {
        // after successful creation jump straight into the studio
        navigate("/studio/label/roster", { replace: true });
      }}
    />
  );
}