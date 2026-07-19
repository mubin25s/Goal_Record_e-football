-- ====================================================================
-- EFOOTBALL TROLL & SCORE TRACKER - DATABASE SCHEMA
-- Copy and run this script in your Supabase SQL Editor (Project > SQL Editor)
-- ====================================================================

-- 1. PROFILES TABLE (Linked to Supabase Auth users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL CONSTRAINT username_length CHECK (char_length(username) >= 3),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update their own profile." 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, avatar_url)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'username', 'player_' || substr(new.id::text, 1, 6)),
        new.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. MATCHES TABLE
CREATE TABLE public.matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    winner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    loser_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    loser_name TEXT, -- Fallback name if the loser is not a registered user
    winner_score INTEGER NOT NULL CONSTRAINT positive_winner_score CHECK (winner_score >= 0),
    loser_score INTEGER NOT NULL CONSTRAINT positive_loser_score CHECK (loser_score >= 0),
    screenshot_url TEXT NOT NULL, -- Path to the image in supabase storage
    troll_comment TEXT,
    status TEXT DEFAULT 'verified' CONSTRAINT valid_status CHECK (status IN ('verified', 'disputed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure winner score is higher than loser score
    CONSTRAINT winner_must_win CHECK (winner_score > loser_score)
);

-- Enable Row Level Security
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Matches Policies
CREATE POLICY "Matches are viewable by everyone." 
    ON public.matches FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can insert matches." 
    ON public.matches FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = winner_id);

CREATE POLICY "Winners can update their logged matches." 
    ON public.matches FOR UPDATE 
    USING (auth.uid() = winner_id);

CREATE POLICY "Winners can delete their logged matches." 
    ON public.matches FOR DELETE 
    USING (auth.uid() = winner_id);


-- 3. COMMENTS TABLE (For trolling feed interaction)
CREATE TABLE public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL CONSTRAINT non_empty_content CHECK (char_length(trim(content)) > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Comments Policies
CREATE POLICY "Comments are viewable by everyone." 
    ON public.comments FOR SELECT 
    USING (true);

CREATE POLICY "Authenticated users can insert comments." 
    ON public.comments FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments." 
    ON public.comments FOR DELETE 
    USING (auth.uid() = user_id);


-- 4. STORAGE BUCKET CONFIGURATION (For winning screenshots)
-- Run this SQL to insert the bucket config if storage schema is initialized
INSERT INTO storage.buckets (id, name, public) 
VALUES ('match-screenshots', 'match-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Allow public read access to screenshots"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'match-screenshots');

CREATE POLICY "Allow authenticated uploads to screenshots"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'match-screenshots' AND auth.role() = 'authenticated');

CREATE POLICY "Allow owners to delete their screenshots"
    ON storage.objects FOR DELETE
    WITH CHECK (bucket_id = 'match-screenshots' AND auth.uid()::text = owner::text);
