-- Plantillas de aviso de vencimiento por plataforma
INSERT INTO message_templates (id, key, name, body, platform, variables, updated_at)
VALUES
  (
    gen_random_uuid(),
    'raptor_expiry',
    'Raptor TV — Aviso vencimiento',
    E'⚠️ Hola! *Tu cuenta de _Raptor TV_ vence HOY.* \n\nNo te quedes esta noche sin canales, sin películas, sin series... *por un simple descuido* 😱\n\n*Raptor TV* es tu entretenimiento de confianza todos los días, sin cortes ni interrupciones.\n\nA continuación *te dejo los planes disponibles para que elijas el que mejor te convenga 👇* \n\n✅ Escríbeme y te lo activo al instante.',
    'raptor',
    '{}',
    now()
  ),
  (
    gen_random_uuid(),
    'clicktv_expiry',
    'ClickTV — Aviso vencimiento',
    E'⚠️ Hola! *Tu cuenta de _Click TV_ vence HOY.* \n\nNo te quedes esta noche sin canales, sin películas, sin series... *por un simple descuido* 😱\n\n*Click TV* es tu entretenimiento de confianza todos los días, sin cortes ni interrupciones.\n\nA continuación *te dejo los planes disponibles para que elijas el que mejor te convenga 👇* \n\n✅ Escríbeme y te lo activo al instante.',
    'clicktv',
    '{}',
    now()
  )
ON CONFLICT (key) DO UPDATE
  SET name       = EXCLUDED.name,
      body       = EXCLUDED.body,
      platform   = EXCLUDED.platform,
      updated_at = now();
