-- Create campus_events table (If it doesn't already exist from the previous message)
CREATE TABLE IF NOT EXISTS public.campus_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL, -- 'exam', 'deadline', 'meetup', 'personal'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for campus_events
ALTER TABLE public.campus_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own events" ON public.campus_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own events" ON public.campus_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own events" ON public.campus_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own events" ON public.campus_events FOR DELETE USING (auth.uid() = user_id);

-- Create whiteboards table
CREATE TABLE IF NOT EXISTS public.whiteboards (
    room_id TEXT PRIMARY KEY,
    elements JSONB DEFAULT '[]'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for whiteboards (Public read/write for people who know the specific room ID)
ALTER TABLE public.whiteboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read whiteboards" ON public.whiteboards FOR SELECT USING (true);
CREATE POLICY "Anyone can insert whiteboards" ON public.whiteboards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update whiteboards" ON public.whiteboards FOR UPDATE USING (true);
