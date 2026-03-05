create table if not exists user_sessions (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references users(id) on delete cascade,

    -- session_token_hash bytea not null unique,
    created_at timestamptz not null default now(),
    last_seen_at timestamptz not null default now(),
    expires_at timestamptz not null,
    revoked_at timestamptz,

    -- ip inet,
    -- user_agent text
);


-- create index if not exists user_sessions_user_id_idx on user_sessions(user_id);
-- create index if not exists user_sessions_expires_at_idx on user_sessions(expires_at)
--   where revoked_at is null;