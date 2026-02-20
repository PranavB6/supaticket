create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references users(id),
  assigned_to uuid references users(id),

  title text not null check (char_length(title) between 3 and 200),
  description text not null check (char_length(description) between 1 and 10000),

  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority int not null default 3 check (priority between 1 and 5),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- -- Common list views
-- create index if not exists tickets_created_by_created_at_idx on tickets(created_by, created_at desc);
-- create index if not exists tickets_assigned_to_status_idx on tickets(assigned_to, status)
--   where assigned_to is not null;
-- create index if not exists tickets_status_updated_at_idx on tickets(status, updated_at desc);