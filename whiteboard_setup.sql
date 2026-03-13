-- Re-create whiteboards table to ensure correct schema (team_id instead of old room_id)
DROP TABLE IF EXISTS public.whiteboards;

CREATE TABLE public.whiteboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT DEFAULT 'New Whiteboard',
    elements JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id)
);

-- RLS Policies
ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;

-- Select policy
CREATE POLICY "Team members can view their whiteboard"
ON public.whiteboards FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = public.whiteboards.team_id 
    AND user_id = auth.uid()
    AND status = 'accepted'
));

-- Update policy
CREATE POLICY "Team members can update their whiteboard"
ON public.whiteboards FOR UPDATE
USING (EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = public.whiteboards.team_id 
    AND user_id = auth.uid()
    AND status = 'accepted'
));

-- Insert policy
CREATE POLICY "Team members can insert their whiteboard"
ON public.whiteboards FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_members 
    WHERE team_id = public.whiteboards.team_id 
    AND user_id = auth.uid()
    AND status = 'accepted'
));

-- Enable Real-time
ALTER PUBLICATION supabase_realtime ADD TABLE whiteboards;
