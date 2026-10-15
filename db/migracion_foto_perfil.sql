-- Migración: foto de perfil en la tabla usuario (sirve para Admin, Licitador y Pyme).
-- La imagen se guarda como data URL JPEG de 256x256 (el navegador la recorta y comprime antes de enviarla).
-- Uso:  psql -U postgres -d licitawatch_usuarios -f db/migracion_foto_perfil.sql   (se puede ejecutar más de una vez)
-- Nota: ms-usuarios también la crea solo al iniciar (ddl-auto: update).

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS foto TEXT;
