-- Tabla para rastrear solicitudes de demo (anti-abuso + seguimiento)
CREATE TABLE IF NOT EXISTS demo_requests (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT        NOT NULL,
  phone       TEXT        NOT NULL,   -- solo dígitos, normalizado server-side
  ip          TEXT        NOT NULL,
  package_id  INT         NOT NULL,   -- 6 (4h) o 7 (1h)
  username    TEXT,
  password    TEXT,
  line_id     UUID        REFERENCES lines(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'pending', -- 'ok' | 'error' | 'blocked'
  error_msg   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para las consultas de anti-abuso
CREATE INDEX IF NOT EXISTS demo_requests_phone_idx      ON demo_requests(phone);
CREATE INDEX IF NOT EXISTS demo_requests_ip_idx         ON demo_requests(ip);
CREATE INDEX IF NOT EXISTS demo_requests_created_at_idx ON demo_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS demo_requests_status_idx     ON demo_requests(status);
