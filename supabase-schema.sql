-- ====================================================================
-- GOALS ARENA — COMPLETE SUPABASE SCHEMA
-- Uses Firebase Auth UIDs as TEXT primary keys (no Supabase Auth needed)
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ====================================================================

-- 1. PROFILES TABLE (maps Firebase UIDs → user data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id          TEXT PRIMARY KEY,  -- Firebase UID
    username    TEXT NOT NULL,
    avatar_url  TEXT,
    email       TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
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
    CONSTRAINT winner_must_win CHECK (winner_score > loser_score)
);

-- 6. DISABLE ROW LEVEL SECURITY
-- Safe for a small friends-group app where Firebase Auth protects the UI
ALTER TABLE public.profiles       DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts          DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments  DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches        DISABLE ROW LEVEL SECURITY;

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
