create table if not exists users (
    id uuid primary key default gen_random_uuid(),
    email citext not null unique,
    password_hash text not null,
    role text not null default 'user' check (role in ('user', 'agent', 'admin')),
    display_name text,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

