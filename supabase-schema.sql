-- ====================================================================
-- GOALS ARENA — COMPLETE SUPABASE SCHEMA
-- Uses Firebase Auth UIDs as TEXT primary keys (no Supabase Auth needed)
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ====================================================================

-- 1. PROFILES TABLE (maps Firebase UIDs → user data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id            TEXT PRIMARY KEY,  -- Firebase UID
    username      TEXT NOT NULL,
    avatar_url    TEXT,
    email         TEXT,
    efootball_id  TEXT,              -- eFootball in-game username shown on profile
    created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. POSTS TABLE
CREATE TABLE IF NOT EXISTS public.posts (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    author_id     TEXT        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    author_name   TEXT        NOT NULL,
    author_avatar TEXT,
    content       TEXT        NOT NULL,
    image_url     TEXT,
    category      TEXT        NOT NULL DEFAULT 'Discussion',
    created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. POST REACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.post_reactions (
    post_id  UUID  NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id  TEXT  NOT NULL,  -- Firebase UID
    type     TEXT  NOT NULL CHECK (type IN ('like','love','haha','sad','wow')),
    PRIMARY KEY (post_id, user_id)
);

-- 4. POST COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.post_comments (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id       UUID        NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id     TEXT        NOT NULL,  -- Firebase UID
    author_name   TEXT        NOT NULL,
    author_avatar TEXT,
    content       TEXT        NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. MATCHES TABLE (score submissions)
CREATE TABLE IF NOT EXISTS public.matches (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    winner_id       TEXT        NOT NULL,  -- Firebase UID
    winner_username TEXT        NOT NULL,
    loser_id        TEXT,                  -- NULL if opponent not registered
    loser_username  TEXT        NOT NULL,
    winner_score    INTEGER     NOT NULL CHECK (winner_score >= 0),
    loser_score     INTEGER     NOT NULL CHECK (loser_score >= 0),
    screenshot_url  TEXT        NOT NULL,
    troll_comment   TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT winner_must_win CHECK (winner_score >= loser_score)
);

-- 6. DISABLE ROW LEVEL SECURITY
-- Safe for a small friends-group app where Firebase Auth protects the UI
ALTER TABLE public.profiles       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches        DISABLE ROW LEVEL SECURITY;

-- 6b. MATCH COMMENTS TABLE (banter on match posts)
CREATE TABLE IF NOT EXISTS public.match_comments (
    id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id   UUID        NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id    TEXT        NOT NULL,  -- Firebase UID
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 6c. MATCH REACTIONS TABLE (reactions on match posts)
-- PK on (match_id, user_id) powers upsert with onConflict: 'match_id,user_id'
CREATE TABLE IF NOT EXISTS public.match_reactions (
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id  TEXT NOT NULL,  -- Firebase UID
    type     TEXT NOT NULL CHECK (type IN ('like','love','haha','sad','wow')),
    PRIMARY KEY (match_id, user_id)
);

-- Disable RLS for the match comment/reaction tables too
ALTER TABLE public.match_comments   DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_reactions  DISABLE ROW LEVEL SECURITY;

-- 6. TOURNAMENTS TABLE
CREATE TABLE IF NOT EXISTS public.tournaments (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    title         TEXT        NOT NULL,
    player_count  INTEGER     NOT NULL CHECK (player_count IN (3, 4, 5, 8, 10, 12, 16, 32)),
    match_format  TEXT        NOT NULL DEFAULT 'single', -- 'single' or 'home_away'
    status        TEXT        NOT NULL DEFAULT 'group_stage', -- 'group_stage', 'knockout_stage', 'completed'
    created_by    TEXT        NOT NULL,  -- Firebase UID of Admin
    created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 7. TOURNAMENT PLAYERS TABLE
CREATE TABLE IF NOT EXISTS public.tournament_players (
    id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    player_id     TEXT        NOT NULL,  -- Firebase UID or generated ID
    player_name   TEXT        NOT NULL,
    avatar_url    TEXT,
    group_letter  TEXT,                  -- 'A', 'B', 'C', etc.
    seed          INTEGER     DEFAULT 0
);

-- 8. TOURNAMENT MATCHES TABLE
CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id   UUID        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    stage           TEXT        NOT NULL,  -- 'group', 'round_of_16', 'quarter_final', 'semi_final', 'final'
    group_letter    TEXT,                  -- 'A', 'B', etc. for group stage
    match_number    INTEGER     NOT NULL,
    leg             INTEGER     DEFAULT 1, -- 1 or 2
    player1_id      TEXT        NOT NULL,
    player1_name    TEXT        NOT NULL,
    player2_id      TEXT        NOT NULL,
    player2_name    TEXT        NOT NULL,
    player1_score   INTEGER,
    player2_score   INTEGER,
    proof_image_url TEXT,
    submitted_by    TEXT,
    status          TEXT        NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'locked'
    winner_id       TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 9. DISABLE RLS & ALLOW PUBLIC ACCESS FOR TOURNAMENTS
ALTER TABLE IF EXISTS public.tournaments           DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_players     DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tournament_matches     DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public tournaments access" ON public.tournaments;
CREATE POLICY "Public tournaments access" ON public.tournaments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public tournament_players access" ON public.tournament_players;
CREATE POLICY "Public tournament_players access" ON public.tournament_players FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public tournament_matches access" ON public.tournament_matches;
CREATE POLICY "Public tournament_matches access" ON public.tournament_matches FOR ALL USING (true) WITH CHECK (true);

-- 7. STORAGE — matches bucket (public, allow anon uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('matches', 'matches', true, 5242880)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 5242880;

-- Allow everyone to read from matches bucket
DROP POLICY IF EXISTS "Public read matches" ON storage.objects;
CREATE POLICY "Public read matches"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'matches');

-- Allow anyone to upload to matches bucket (Firebase Auth protects frontend)
DROP POLICY IF EXISTS "Anon insert matches" ON storage.objects;
CREATE POLICY "Anon insert matches"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'matches');

-- Allow anyone to delete from matches bucket
DROP POLICY IF EXISTS "Anon delete matches" ON storage.objects;
CREATE POLICY "Anon delete matches"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'matches');
