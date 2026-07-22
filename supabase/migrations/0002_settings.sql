-- ════════════════════════════════════════════════════════════════
-- IPTV PANEL — Ajustes persistentes en app_config
-- Ejecutar en Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

alter table app_config
  add column if not exists auto_send_on_renew boolean not null default true,
  add column if not exists auto_copy_on_renew  boolean not null default true;
