-- Create daily usage tracking table for persistent rate limiting
CREATE TABLE IF NOT EXISTS daily_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL,
    total_queries INTEGER DEFAULT 0,
    web_search_queries INTEGER DEFAULT 0,
    deep_research_queries INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, usage_date)
);

CREATE INDEX idx_daily_usage_user_id ON daily_usage(user_id);
CREATE INDEX idx_daily_usage_date ON daily_usage(usage_date);

-- Function to reset usage at midnight PST
CREATE OR REPLACE FUNCTION reset_daily_usage_pst() RETURNS VOID AS $$
BEGIN
    -- Convert PST midnight to UTC (PST is UTC-8, so add 8 hours)
    -- This will be called by a cron job at midnight PST
    DELETE FROM daily_usage 
    WHERE usage_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;