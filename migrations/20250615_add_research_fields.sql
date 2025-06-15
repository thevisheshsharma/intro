-- Add new research fields to existing tables
-- Migration: Add research fields
-- Date: 2025-06-15

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add research_sources column to organizations table
    BEGIN
        ALTER TABLE organizations ADD COLUMN research_sources JSONB;
    EXCEPTION
        WHEN duplicate_column THEN
        RAISE NOTICE 'Column research_sources already exists in organizations';
    END;
    
    -- Add recent_developments column to organizations table
    BEGIN
        ALTER TABLE organizations ADD COLUMN recent_developments TEXT;
    EXCEPTION
        WHEN duplicate_column THEN
        RAISE NOTICE 'Column recent_developments already exists in organizations';
    END;
    
    -- Add key_partnerships column to organizations table
    BEGIN
        ALTER TABLE organizations ADD COLUMN key_partnerships TEXT[];
    EXCEPTION
        WHEN duplicate_column THEN
        RAISE NOTICE 'Column key_partnerships already exists in organizations';
    END;
    
    -- Add funding_info column to organizations table
    BEGIN
        ALTER TABLE organizations ADD COLUMN funding_info TEXT;
    EXCEPTION
        WHEN duplicate_column THEN
        RAISE NOTICE 'Column funding_info already exists in organizations';
    END;
    
    -- Add research_sources column to organization_icp table
    BEGIN
        ALTER TABLE organization_icp ADD COLUMN research_sources JSONB;
    EXCEPTION
        WHEN duplicate_column THEN
        RAISE NOTICE 'Column research_sources already exists in organization_icp';
    END;
END $$;
