-- ========================================
-- Complete Database Setup for Agenda Assist
-- ========================================
-- Run this script in your Supabase SQL Editor to set up all tables at once

-- ========================================
-- 1. Create Players Table
-- ========================================

CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_gm boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Insert initial players
INSERT INTO players (name, is_gm) VALUES
  ('Breno', true),
  ('Nalu', false),
  ('Yshi', false),
  ('Drefon', false),
  ('Frizon', false),
  ('Tinga', false),
  ('Zangs', false)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security for players
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create policies for players table
DROP POLICY IF EXISTS "Allow public read" ON players;
DROP POLICY IF EXISTS "Allow public insert" ON players;
DROP POLICY IF EXISTS "Allow public delete" ON players;
DROP POLICY IF EXISTS "Allow public update" ON players;

CREATE POLICY "Allow public read" ON players FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON players FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON players FOR DELETE USING (true);
CREATE POLICY "Allow public update" ON players FOR UPDATE USING (true);

-- ========================================
-- 2. Create Sessions Table
-- ========================================

CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name text NOT NULL,
  day int2 NOT NULL CHECK (day >= 0 AND day <= 6),
  start_hour numeric NOT NULL CHECK (start_hour >= 0 AND start_hour < 24),
  duration numeric NOT NULL CHECK (duration > 0),
  title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS sessions_player_name_idx ON sessions(player_name);
CREATE INDEX IF NOT EXISTS sessions_day_idx ON sessions(day);
CREATE INDEX IF NOT EXISTS sessions_start_hour_idx ON sessions(start_hour);

-- Enable Row Level Security for sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for sessions table
DROP POLICY IF EXISTS "Allow public read" ON sessions;
DROP POLICY IF EXISTS "Allow public insert" ON sessions;
DROP POLICY IF EXISTS "Allow public delete" ON sessions;
DROP POLICY IF EXISTS "Allow public update" ON sessions;

CREATE POLICY "Allow public read" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete" ON sessions FOR DELETE USING (true);
CREATE POLICY "Allow public update" ON sessions FOR UPDATE USING (true);

-- ========================================
-- Setup Complete!
-- ========================================

