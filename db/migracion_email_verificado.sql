-- Migración: verificación del correo al registrarse (tabla usuario de licitawatch_usuarios).
-- Las cuentas nuevas se crean con email_verificado = FALSE y no pueden iniciar sesión hasta abrir el enlace
-- que llega al correo de acceso (vence en 24 horas). Las cuentas que ya existían quedan verificadas (DEFAULT TRUE).
-- Uso:  psql -U postgres -d licitawatch_usuarios -f db/migracion_email_verificado.sql   (se puede ejecutar más de una vez)
-- Nota: ms-usuarios también la crea solo al iniciar (ddl-auto: update).

ALTER TABLE usuario ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN NOT NULL DEFAULT TRUE;
