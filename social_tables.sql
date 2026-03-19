-- SQL Migration to add missing Social Features (Q&A and Study Partners)

-- 1. Q&A Questions Table
CREATE TABLE IF NOT EXISTS public.qa_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  subject text,
  tags text[] DEFAULT '{}',
  answer_count integer DEFAULT 0,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view questions" ON public.qa_questions FOR SELECT USING (true);
CREATE POLICY "Users can create questions" ON public.qa_questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own questions" ON public.qa_questions FOR UPDATE USING (auth.uid() = user_id);

-- 2. Q&A Answers Table
CREATE TABLE IF NOT EXISTS public.qa_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_accepted boolean DEFAULT false,
  upvotes integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view answers" ON public.qa_answers FOR SELECT USING (true);
CREATE POLICY "Users can create answers" ON public.qa_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own answers" ON public.qa_answers FOR UPDATE USING (auth.uid() = user_id);

-- 3. Q&A Answer Votes (to prevent double voting)
CREATE TABLE IF NOT EXISTS public.qa_answer_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid REFERENCES public.qa_answers(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(answer_id, user_id)
);
ALTER TABLE public.qa_answer_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view answer votes" ON public.qa_answer_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.qa_answer_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Study Partner Requests Table
CREATE TABLE IF NOT EXISTS public.study_partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  description text,
  availability text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.study_partner_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view partner requests" ON public.study_partner_requests FOR SELECT USING (true);
CREATE POLICY "Users can create partner requests" ON public.study_partner_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own partner requests" ON public.study_partner_requests FOR UPDATE USING (auth.uid() = user_id);

-- 5. Study Group Invites Table
CREATE TABLE IF NOT EXISTS public.study_group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid REFERENCES public.study_groups(id) ON DELETE CASCADE,
  inviter_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at timestamptz DEFAULT now(),
  UNIQUE(group_id, invitee_id)
);
ALTER TABLE public.study_group_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own invites" ON public.study_group_invites FOR SELECT USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);
CREATE POLICY "Users can send invites" ON public.study_group_invites FOR INSERT WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Users can respond to invites" ON public.study_group_invites FOR UPDATE USING (auth.uid() = invitee_id OR auth.uid() = inviter_id);
CREATE POLICY "Users can withdraw invites" ON public.study_group_invites FOR DELETE USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

