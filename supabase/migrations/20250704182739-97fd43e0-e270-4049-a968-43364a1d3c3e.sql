-- Create collaboration projects table
CREATE TABLE public.collaboration_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  genre TEXT NOT NULL,
  skills_needed TEXT[] NOT NULL DEFAULT '{}',
  budget_range TEXT,
  deadline DATE,
  status TEXT NOT NULL DEFAULT 'open',
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  requirements TEXT,
  project_type TEXT DEFAULT 'collaboration',
  is_featured BOOLEAN DEFAULT false
);

-- Create project applications table
CREATE TABLE public.project_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  applicant_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, applicant_id)
);

-- Create conversations table for messaging
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, participant_1, participant_2)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_read BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.collaboration_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for collaboration_projects
CREATE POLICY "Projects are viewable by everyone" 
ON public.collaboration_projects 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own projects" 
ON public.collaboration_projects 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects" 
ON public.collaboration_projects 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects" 
ON public.collaboration_projects 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for project_applications
CREATE POLICY "Applications viewable by project owner and applicant" 
ON public.project_applications 
FOR SELECT 
USING (
  auth.uid() = applicant_id OR 
  auth.uid() IN (SELECT user_id FROM collaboration_projects WHERE id = project_id)
);

CREATE POLICY "Users can create applications" 
ON public.project_applications 
FOR INSERT 
WITH CHECK (auth.uid() = applicant_id);

CREATE POLICY "Project owners can update application status" 
ON public.project_applications 
FOR UPDATE 
USING (
  auth.uid() IN (SELECT user_id FROM collaboration_projects WHERE id = project_id)
);

-- RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() IN (
    SELECT participant_1 FROM conversations WHERE id = conversation_id
    UNION
    SELECT participant_2 FROM conversations WHERE id = conversation_id
  )
);

CREATE POLICY "Users can send messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IN (
    SELECT participant_1 FROM conversations WHERE id = conversation_id
    UNION
    SELECT participant_2 FROM conversations WHERE id = conversation_id
  )
);

-- Create indexes for performance
CREATE INDEX idx_collaboration_projects_user_id ON public.collaboration_projects(user_id);
CREATE INDEX idx_collaboration_projects_status ON public.collaboration_projects(status);
CREATE INDEX idx_collaboration_projects_genre ON public.collaboration_projects(genre);
CREATE INDEX idx_project_applications_project_id ON public.project_applications(project_id);
CREATE INDEX idx_project_applications_applicant_id ON public.project_applications(applicant_id);
CREATE INDEX idx_conversations_participants ON public.conversations(participant_1, participant_2);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);

-- Add foreign key constraints
ALTER TABLE public.project_applications 
ADD CONSTRAINT fk_project_applications_project_id 
FOREIGN KEY (project_id) REFERENCES public.collaboration_projects(id) ON DELETE CASCADE;

ALTER TABLE public.messages 
ADD CONSTRAINT fk_messages_conversation_id 
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Create trigger for updated_at
CREATE TRIGGER update_collaboration_projects_updated_at
  BEFORE UPDATE ON public.collaboration_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_applications_updated_at
  BEFORE UPDATE ON public.project_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();