-- Create workspace_spaces table
CREATE TABLE IF NOT EXISTS public.workspace_spaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    emoji TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create workspace_tasks table
CREATE TABLE IF NOT EXISTS public.workspace_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    space_id UUID REFERENCES public.workspace_spaces(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    priority TEXT,
    due_date TEXT,
    assignee TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.workspace_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for workspace_spaces
CREATE POLICY "Users can view their own spaces" 
ON public.workspace_spaces FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own spaces" 
ON public.workspace_spaces FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own spaces" 
ON public.workspace_spaces FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own spaces" 
ON public.workspace_spaces FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for workspace_tasks
CREATE POLICY "Users can view their own tasks" 
ON public.workspace_tasks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" 
ON public.workspace_tasks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" 
ON public.workspace_tasks FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" 
ON public.workspace_tasks FOR DELETE 
USING (auth.uid() = user_id);

-- Enable real-time for both tables
alter publication supabase_realtime add table workspace_spaces;
alter publication supabase_realtime add table workspace_tasks;
