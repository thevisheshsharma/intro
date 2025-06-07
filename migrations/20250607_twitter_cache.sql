-- Twitter User Cache Table
CREATE TABLE IF NOT EXISTS twitter_user_cache (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_data JSONB NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(username),
    UNIQUE(user_id)
);

-- Twitter Followings Cache Table
CREATE TABLE IF NOT EXISTS twitter_followings_cache (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    user_id TEXT NOT NULL,
    followings JSONB NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(username),
    UNIQUE(user_id)
);

-- Twitter Followers Cache Table
CREATE TABLE IF NOT EXISTS twitter_followers_cache (
    id BIGSERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    user_id TEXT NOT NULL,
    followers JSONB NOT NULL,
    fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(username),
    UNIQUE(user_id)
);
