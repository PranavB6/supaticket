create table if not exists ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid not null references users(id),

  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now()
);

-- create index if not exists ticket_comments_ticket_id_created_at_idx
--   on ticket_comments(ticket_id, created_at);