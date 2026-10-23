-- LicitaWatch · BD NOTIFICACIONES (licitawatch_notificaciones) · sigue el ER "API NOTIFICACIONES — BD normalizada".
-- psql -U postgres -d licitawatch_notificaciones -f 05_notificaciones.sql
-- usuario_id es REF a Usuarios (sin FK). El microservicio Asistente (LicitAsist) NO tiene base de datos: es externo (Groq).

CREATE TABLE IF NOT EXISTS tipo_notificacion (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL,
  CONSTRAINT uq_tipo_notif UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS notificacion (
  id                    BIGSERIAL PRIMARY KEY,
  usuario_id            BIGINT  NOT NULL,       -- REF Usuarios
  tipo_notificacion_id  INTEGER NOT NULL REFERENCES tipo_notificacion(id),
  canal                 VARCHAR(20) NOT NULL DEFAULT 'email',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_notif_usuario ON notificacion(usuario_id);

INSERT INTO tipo_notificacion (nombre) VALUES
  ('Licitación publicada'), ('Postulación recibida'), ('Postulación aprobada'),
  ('Postulación rechazada'), ('Pago confirmado'), ('Mensaje nuevo'),
  ('Licitación de tu rubro')                    -- aviso a las Pymes del rubro (correo solo a las Premium)
ON CONFLICT DO NOTHING;
