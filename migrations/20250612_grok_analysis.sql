-- Migration: Grok Analysis Storage
-- Created: 2025-06-12
-- Description: Create tables for storing Grok AI analysis results

-- Create grok_analysis table for storing profile analysis results
CREATE TABLE IF NOT EXISTS grok_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Profile identifiers
    twitter_username VARCHAR(255) NOT NULL,
    twitter_user_id VARCHAR(255),
    profile_hash VARCHAR(64) NOT NULL, -- Hash of profile data for cache invalidation
    
    -- Analysis results (structured data)
    role VARCHAR(255),
    company VARCHAR(255),
    expertise TEXT,
    summary TEXT,
    confidence VARCHAR(20) CHECK (confidence IN ('high', 'medium', 'low')),
    
    -- Raw data for reference
    raw_profile_data JSONB,
    raw_grok_response TEXT,
    
    -- Analysis metadata
    model_used VARCHAR(50),
    analysis_type VARCHAR(50) DEFAULT 'profile',
    token_usage INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Create unique constraint to prevent duplicates
    UNIQUE(twitter_username, profile_hash)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_grok_analysis_username ON grok_analysis(twitter_username);
CREATE INDEX IF NOT EXISTS idx_grok_analysis_user_id ON grok_analysis(twitter_user_id);
CREATE INDEX IF NOT EXISTS idx_grok_analysis_created_at ON grok_analysis(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_grok_analysis_updated_at 
    BEFORE UPDATE ON grok_analysis 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create analysis_cache table for general purpose caching
CREATE TABLE IF NOT EXISTS grok_analysis_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for cache lookups
CREATE INDEX IF NOT EXISTS idx_grok_cache_key ON grok_analysis_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_grok_cache_expires ON grok_analysis_cache(expires_at);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM grok_analysis_cache 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ language 'plpgsql';