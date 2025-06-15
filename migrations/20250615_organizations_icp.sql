-- Migration: Organizations and ICP Analysis
-- Created: 2025-06-15
-- Description: Create tables for organization management and ICP analysis

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL, -- Clerk user ID
    
    -- Organization basic info
    name VARCHAR(255) NOT NULL,
    twitter_username VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    business_info TEXT,
    
    -- Organization metadata
    website_url VARCHAR(500),
    industry VARCHAR(500), -- Increased from 255 to handle longer industry descriptions
    employee_count VARCHAR(100), -- Increased from 50 to handle detailed company size info
    location VARCHAR(500), -- Increased from 255 for detailed location info
    
    -- Social links discovered by Grok
    social_links JSONB,
    
    -- New research fields from live search
    research_sources JSONB,
    recent_developments TEXT,
    key_partnerships TEXT[],
    funding_info TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ICP (Ideal Customer Profile) table
CREATE TABLE IF NOT EXISTS organization_icp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- ICP Analysis from Grok
    target_industry VARCHAR(500), -- Increased to handle detailed industry descriptions
    target_role VARCHAR(500), -- Increased to handle detailed role descriptions
    company_size VARCHAR(200), -- Increased to handle detailed company size info
    geographic_location VARCHAR(500), -- Increased for detailed location info
    pain_points TEXT[],
    keywords TEXT[],
    
    -- ICP details
    demographics JSONB,
    psychographics JSONB,
    behavioral_traits JSONB,
    
    -- Analysis metadata
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    analysis_summary TEXT,
    grok_response TEXT,
    model_used VARCHAR(50),
    token_usage INTEGER,
    
    -- Research sources from live search
    research_sources JSONB,
    
    -- User customizations
    is_custom BOOLEAN DEFAULT FALSE,
    custom_notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_organizations_user_id ON organizations(user_id);
CREATE INDEX IF NOT EXISTS idx_organizations_twitter_username ON organizations(twitter_username);
CREATE INDEX IF NOT EXISTS idx_organization_icp_org_id ON organization_icp(organization_id);

-- Create unique constraint for organization upsert operations
CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_user_twitter_unique 
    ON organizations(user_id, twitter_username);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_icp_updated_at
    BEFORE UPDATE ON organization_icp
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
