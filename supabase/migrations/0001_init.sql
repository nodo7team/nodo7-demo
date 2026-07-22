-- ════════════════════════════════════════════════════════════════
-- IPTV PANEL — Schema completo
-- Ejecutar en Supabase SQL Editor (o vía CLI)
-- ════════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────────
do $$ begin
  create type platform_t as enum ('clicktv', 'raptor');
exception when duplicate_object then null; end $$;

do $$ begin
  create type line_status_t as enum ('active', 'expiring', 'expired', 'blocked', 'demo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type action_t as enum (
    'create_paid', 'create_demo', 'renew', 'renew_pass',
    'reset_password', 'disable', 'enable', 'delete', 'sync'
  );
exception when duplicate_object then null; end $$;

-- ────────────────────────────────────────────────────────────────
-- TABLA: clients (personas reales)
-- ────────────────────────────────────────────────────────────────
create table if not exists clients (
  id uuid primary key default uuid_generate_v4(),
  name text,
  phone text unique,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_phone_idx on clients(phone);
create index if not exists clients_name_idx on clients(name);

-- ────────────────────────────────────────────────────────────────
-- TABLA: lines (cuentas en plataformas IPTV)
-- ────────────────────────────────────────────────────────────────
create table if not exists lines (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references clients(id) on delete set null,
  platform platform_t not null,
  external_id text not null,           -- line_id ClickTV o email Raptor
  username text not null,              -- "matiastv877" o "matias@gmail.com"
  password text,                       -- guardado para mostrar de nuevo
  screens int default 1,
  package_id int,                      -- solo ClickTV
  package_label text,                  -- texto descriptivo
  expires_at date,
  status line_status_t not null default 'active',
  last_synced_at timestamptz,
  synced_data jsonb,                   -- snapshot crudo
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(platform, external_id)
);

create index if not exists lines_client_id_idx on lines(client_id);
create index if not exists lines_platform_idx on lines(platform);
create index if not exists lines_expires_at_idx on lines(expires_at);
create index if not exists lines_username_idx on lines(username);
create index if not exists lines_status_idx on lines(status);

-- ────────────────────────────────────────────────────────────────
-- TABLA: message_templates (plantillas editables)
-- ────────────────────────────────────────────────────────────────
create table if not exists message_templates (
  id uuid primary key default uuid_generate_v4(),
  key text unique not null,
  name text not null,
  body text not null,
  variables text[] default '{}',
  platform platform_t,
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────────
-- TABLA: actions_log (auditoría)
-- ────────────────────────────────────────────────────────────────
create table if not exists actions_log (
  id uuid primary key default uuid_generate_v4(),
  action action_t not null,
  platform platform_t,
  line_id uuid references lines(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  payload jsonb,
  result jsonb,
  success boolean default true,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists actions_log_created_at_idx on actions_log(created_at desc);
create index if not exists actions_log_line_id_idx on actions_log(line_id);

-- ────────────────────────────────────────────────────────────────
-- TABLA: app_config (configuración global — solo 1 fila)
-- ────────────────────────────────────────────────────────────────
create table if not exists app_config (
  id int primary key default 1,
  pin_hash text,
  last_full_sync_at timestamptz,
  clicktv_credits int,
  raptor_credits int,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into app_config (id) values (1) on conflict do nothing;

-- ────────────────────────────────────────────────────────────────
-- TRIGGERS: updated_at automático
-- ────────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists clients_updated_at on clients;
create trigger clients_updated_at before update on clients
  for each row execute function set_updated_at();

drop trigger if exists lines_updated_at on lines;
create trigger lines_updated_at before update on lines
  for each row execute function set_updated_at();

drop trigger if exists message_templates_updated_at on message_templates;
create trigger message_templates_updated_at before update on message_templates
  for each row execute function set_updated_at();

drop trigger if exists app_config_updated_at on app_config;
create trigger app_config_updated_at before update on app_config
  for each row execute function set_updated_at();

-- ────────────────────────────────────────────────────────────────
-- SEED: Plantillas iniciales
-- ────────────────────────────────────────────────────────────────
insert into message_templates (key, name, body, variables, platform) values
('clicktv_paid', 'ClickTV — Cuenta paga (nueva)',
'*¡Gracias por tu compra!* 🙌✨

Ya tenés tu servicio *ClickTV* activo.
Te dejo tus datos de acceso 👇

👤 *Usuario:* {username}
🔑 *Contraseña:* {password}

👉 RESPETAR MAYÚSCULAS Y MINÚSCULA

✅ PANTALLAS: {screens}

IMPORTANTE: *DEBE RESPETAR EL NÚMERO DE PANTALLAS SOLICITADOS* PARA EVITAR BLOQUEOS AUTOMATICOS DEL SISTEMA.

📅 *Vencimiento del servicio:* {expiry_date}

Esperamos que disfrutes todo el contenido y la experiencia ClickTV 📺🔥
Tu confianza y recomendación nos ayudan muchísimo a seguir creciendo y mejorando cada día.

Cualquier duda, consulta o ayuda con la instalación,
*escribime cuando quieras y te respondo al toque.* 👌⚡️

¡Gracias por elegirnos!',
ARRAY['username','password','screens','expiry_date'],
'clicktv'),

('clicktv_renew', 'ClickTV — Renovación (mismo pass)',
'*¡Tu servicio ClickTV fue renovado!* 🔄✨

Te dejo los datos actualizados 👇

👤 *Usuario:* {username}
🔑 *Contraseña:* {password}

👉 RESPETAR MAYÚSCULAS Y MINÚSCULA

✅ PANTALLAS: {screens}

IMPORTANTE: *DEBE RESPETAR EL NÚMERO DE PANTALLAS SOLICITADOS* PARA EVITAR BLOQUEOS AUTOMATICOS DEL SISTEMA.

📅 *Nuevo vencimiento:* {expiry_date}

Gracias por seguir confiando en ClickTV 📺🔥
Cualquier duda, *escribime y te respondo al toque.* 👌⚡️',
ARRAY['username','password','screens','expiry_date'],
'clicktv'),

('clicktv_renew_pass', 'ClickTV — Renovación + cambio de pass',
'✅ ¡Renovación confirmada! Gracias por seguir con nosotros.

🔐 AVISO IMPORTANTE: Tu contraseña fue reiniciada como parte del proceso de renovación.

Tus nuevos datos de acceso son:
👤 Usuario: {username}
🔑 Contraseña: {password}
✅ Pantallas: {screens}
🗓️ Vencimiento: {expiry_date}

⚠️ ANTES DE INGRESAR (en todos los dispositivos donde usaste la cuenta):

Es *obligatorio borrar los datos de la app Click TV* desde la configuración del dispositivo. _Esto elimina la sesión anterior y evita errores de acceso._

📺📱 Pasos:
Configuración del dispositivo → Aplicaciones → Click TV → Almacenamiento → Borrar datos

_Luego abrí la app e iniciá sesión con tus nuevos datos._

Si tenés alguna duda, escribime. 🙌',
ARRAY['username','password','screens','expiry_date'],
'clicktv'),

('clicktv_reset_pass', 'ClickTV — Solo reinicio de contraseña',
'🔐 *Tu contraseña ClickTV fue actualizada*

Tus nuevos datos de acceso:
👤 Usuario: {username}
🔑 Contraseña: {password}
✅ Pantallas: {screens}

⚠️ Antes de ingresar:
Configuración del dispositivo → Aplicaciones → Click TV → Almacenamiento → *Borrar datos*

Luego abrí la app e iniciá sesión con la nueva contraseña.

Cualquier consulta, escribime. 🙌',
ARRAY['username','password','screens'],
'clicktv'),

('clicktv_demo', 'ClickTV — Demo',
'*¡Tu demo ClickTV está lista!* 🎬✨

Probá todo el contenido sin compromiso 👇

👤 *Usuario:* {username}
🔑 *Contraseña:* {password}

👉 RESPETAR MAYÚSCULAS Y MINÚSCULA

⏱ *Duración:* 1 hora FULL

Cualquier duda o si querés pasar a un plan completo,
*escribime y te respondo al toque.* 👌⚡️

¡Que la disfrutes! 🍿🔥',
ARRAY['username','password'],
'clicktv'),

('raptor_paid', 'Raptor TV — Cuenta paga (nueva)',
'Gracias por su compra 🙏🏻

👉 PANTALLAS: *{screens}*

✅ DATOS CUENTA PAGA

Correo: {username}
Contraseña: {password}

*⚠️ Vencimiento: {expiry_date}*

Estamos a su disposición ante cualquier duda 🤔

💡 Debes dirigirte al icono de Ajustes (⚙️) y cerrar sesión de la demo, luego ingresas con los datos que te envié.',
ARRAY['username','password','screens','expiry_date'],
'raptor'),

('raptor_renew', 'Raptor TV — Renovación',
'*¡Tu servicio Raptor TV fue renovado!* 🔄✨

👤 *Usuario:* {username}

📅 *Nuevo vencimiento:* {expiry_date}

¡Gracias por seguir con nosotros! 📺🔥',
ARRAY['username','expiry_date'],
'raptor')

on conflict (key) do nothing;

-- ────────────────────────────────────────────────────────────────
-- VISTA: clients_with_lines (clientes con sus líneas agregadas)
-- ────────────────────────────────────────────────────────────────
create or replace view clients_with_lines as
select
  c.id,
  c.name,
  c.phone,
  c.notes,
  c.created_at,
  c.updated_at,
  count(l.id) filter (where l.status <> 'expired') as active_lines,
  count(l.id) as total_lines,
  min(l.expires_at) filter (where l.status in ('active','expiring','demo')) as next_expiry,
  jsonb_agg(
    jsonb_build_object(
      'id', l.id,
      'platform', l.platform,
      'username', l.username,
      'screens', l.screens,
      'expires_at', l.expires_at,
      'status', l.status
    ) order by l.expires_at asc
  ) filter (where l.id is not null) as lines
from clients c
left join lines l on l.client_id = c.id
group by c.id;

-- ════════════════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════════════════
