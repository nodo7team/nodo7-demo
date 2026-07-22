-- Agrega columna is_demo controlada por el panel (no depende del campo is_trial del API)
-- Esto corrige el bug donde el sync sobreescribía el status a 'demo' basándose
-- en un campo poco confiable de la API de ClickTV.

ALTER TABLE lines ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

-- Todas las líneas existentes arrancan con is_demo = false.
-- El campo se seteará a true ÚNICAMENTE cuando el panel cree explícitamente una demo.
-- En el próximo sync, las líneas incorrectamente marcadas como demo serán
-- reclasificadas según su fecha de vencimiento real.
