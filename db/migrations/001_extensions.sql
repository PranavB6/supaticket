create extension if not exists pgcrypto; -- for gen_random_uuid + crypt helpers
create extension if not exists citext; -- for citext in email