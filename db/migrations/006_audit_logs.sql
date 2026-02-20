create table if not exists ticket_events (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  actor_id uuid references users(id),
  event_type text not null, -- 'created','status_changed','assigned','commented', etc.
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- create index if not exists ticket_events_ticket_id_created_at_idx
--   on ticket_events(ticket_id, created_at);