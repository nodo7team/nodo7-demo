-- ──────────────────────────────────────────────────────────────────────
-- 0003: Pantallas compartidas entre múltiples clientes en una misma línea
--
-- Una línea IPTV con varias pantallas puede ser "compartida" visualmente
-- entre distintos clientes. Esto NO afecta la plataforma (ClickTV/Raptor),
-- es solo tracking interno para saber qué pantallas cobra a quién.
--
-- Ejecutar en: Supabase → SQL Editor → Run
-- ──────────────────────────────────────────────────────────────────────

create table if not exists line_shares (
  id          uuid        primary key default uuid_generate_v4(),
  line_id     uuid        not null references lines(id)   on delete cascade,
  client_id   uuid        not null references clients(id) on delete cascade,
  screens     int         not null default 1 check (screens > 0),
  notes       text,
  created_at  timestamptz not null default now(),
  unique (line_id, client_id)
);

create index if not exists line_shares_line_id_idx   on line_shares(line_id);
create index if not exists line_shares_client_id_idx on line_shares(client_id);
