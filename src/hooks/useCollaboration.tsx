import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface CollaborationProject {
  id: string;
  user_id: string;
  title: string;
  description: string;
  genre: string;
  skills_needed: string[];
  budget_range?: string;
  deadline?: string;
  status: string;
  votes: number;
  created_at: string;
  updated_at: string;
  requirements?: string;
  project_type?: string;
  is_featured?: boolean;
  applications_count?: number;
}

export interface ProjectApplication {
  id: string;
  project_id: string;
  applicant_id: string;
  message?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export const useCollaboration = (options?: { autoFetch?: boolean }) => {
  const [projects, setProjects] = useState<CollaborationProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collaboration_projects')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error loading projects",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: {
    title: string;
    description: string;
    genre: string;
    skills_needed: string[];
    budget_range?: string;
    deadline?: string;
    requirements?: string;
    status: string;
  }) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create a project",
        variant: "destructive"
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('collaboration_projects')
        .insert([{
          ...projectData,
          user_id: user.id
        }])
        .select()
        .maybeSingle();

      if (error) throw error;

      toast({
        title: "Project created!",
        description: "Your collaboration project has been posted successfully."
      });

      fetchProjects(); // Refresh the list
      return data;
    } catch (err: any) {
      toast({
        title: "Error creating project",
        description: err.message,
        variant: "destructive"
      });
      return null;
    }
  };

  const applyToProject = async (projectId: string, message?: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to apply to projects",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('project_applications')
        .insert([{
          project_id: projectId,
          applicant_id: user.id,
          message: message || ''
        }]);

      if (error) throw error;

      toast({
        title: "Application sent!",
        description: "Your application has been sent to the project owner."
      });

      return true;
    } catch (err: any) {
      if (err.code === '23505') { // Unique constraint violation
        toast({
          title: "Already applied",
          description: "You have already applied to this project.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error applying",
          description: err.message,
          variant: "destructive"
        });
      }
      return false;
    }
  };

  const updateProjectBudget = async (projectId: string, budgetRange: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to update project budgets",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('collaboration_projects')
        .update({ budget_range: budgetRange })
        .eq('id', projectId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Budget updated",
        description: "Your project budget has been saved."
      });

      await fetchProjects();
      return true;
    } catch (err: any) {
      toast({
        title: "Error updating budget",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  };

  const hasUserApplied = async (projectId: string) => {
    if (!user) return false;
    try {
      const { data, error } = await supabase
        .from('project_applications')
        .select('id')
        .eq('project_id', projectId)
        .eq('applicant_id', user.id)
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } catch (err) {
      return false;
    }
  };

  const getUserProjects = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('collaboration_projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      toast({
        title: "Error loading your projects",
        description: err.message,
        variant: "destructive"
      });
      return [];
    }
  };

  const getUserApplications = async () => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('project_applications')
        .select(`
          *,
          collaboration_projects (
            title,
            status
          )
        `)
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err: any) {
      toast({
        title: "Error loading your applications",
        description: err.message,
        variant: "destructive"
      });
      return [];
    }
  };

  useEffect(() => {
    if (options?.autoFetch !== false) {
      fetchProjects();
    }
  }, []);

  return {
    projects,
    loading,
    error,
    fetchProjects,
    createProject,
    applyToProject,
    hasUserApplied,
    getUserProjects,
    getUserApplications,
    updateProjectBudget
  };
};