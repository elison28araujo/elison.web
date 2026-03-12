-- Elison Bio Analytics - Database Schema
-- Execute this in the Supabase SQL Editor

-- 1. Profiles Table (Extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  background_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Links Table
CREATE TABLE IF NOT EXISTS public.links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Visits Table
CREATE TABLE IF NOT EXISTS public.visits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Clicks Table
CREATE TABLE IF NOT EXISTS public.clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  link_id UUID REFERENCES public.links(id) ON DELETE CASCADE,
  referrer TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_links_profile_id ON public.links(profile_id);
CREATE INDEX IF NOT EXISTS idx_visits_profile_id ON public.visits(profile_id);
CREATE INDEX IF NOT EXISTS idx_clicks_profile_id ON public.clicks(profile_id);
CREATE INDEX IF NOT EXISTS idx_clicks_link_id ON public.clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_visits_created_at ON public.visits(created_at);
CREATE INDEX IF NOT EXISTS idx_clicks_created_at ON public.clicks(created_at);

-- Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clicks ENABLE ROW LEVEL SECURITY;

-- Policies
-- Profiles: Users can read any profile, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Links: Everyone can view active links, only owners can manage
CREATE POLICY "Active links are viewable by everyone" ON public.links FOR SELECT USING (is_active = true);
CREATE POLICY "Owners can manage links" ON public.links FOR ALL USING (auth.uid() = profile_id);

-- Visits/Clicks: Public can insert (tracking), only owners can read (analytics)
CREATE POLICY "Public can insert visits" ON public.visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can view visits" ON public.visits FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Public can insert clicks" ON public.clicks FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can view clicks" ON public.clicks FOR SELECT USING (auth.uid() = profile_id);
