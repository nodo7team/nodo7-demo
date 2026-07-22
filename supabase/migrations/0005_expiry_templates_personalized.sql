-- Actualiza las plantillas de aviso de vencimiento con personalización por nombre
UPDATE message_templates
SET
  body = E'⚠️ Hola {name}! *Tu cuenta de _Raptor TV_ vence HOY.* \n\nNo te quedes esta noche sin canales, sin películas, sin series... *por un simple descuido* 😱\n\n*Raptor TV* es tu entretenimiento de confianza todos los días, sin cortes ni interrupciones.\n\nA continuación *te dejo los planes disponibles para que elijas el que mejor te convenga 👇* \n\n✅ Escríbeme y te lo activo al instante.',
  variables = ARRAY['name'],
  updated_at = now()
WHERE key = 'raptor_expiry';

UPDATE message_templates
SET
  body = E'⚠️ Hola {name}! *Tu cuenta de _Click TV_ vence HOY.* \n\nNo te quedes esta noche sin canales, sin películas, sin series... *por un simple descuido* 😱\n\n*Click TV* es tu entretenimiento de confianza todos los días, sin cortes ni interrupciones.\n\nA continuación *te dejo los planes disponibles para que elijas el que mejor te convenga 👇* \n\n✅ Escríbeme y te lo activo al instante.',
  variables = ARRAY['name'],
  updated_at = now()
WHERE key = 'clicktv_expiry';
