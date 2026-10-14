-- LicitaWatch · BD VENTAS (licitawatch_ventas) · sigue el ER "API MS-VENTAS — BD normalizada".
-- psql -U postgres -d licitawatch_ventas -f 03_ventas.sql
-- Cadena: plan_suscripcion -> suscripcion -> venta -> pago.   usuario_id es REF a Usuarios (sin FK).

CREATE TABLE IF NOT EXISTS plan_suscripcion (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,                  -- Estándar / Premium
  CONSTRAINT uq_plan_nombre UNIQUE (nombre)
);
CREATE TABLE IF NOT EXISTS estado_suscripcion (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,                  -- Activa, Vencida, Cancelada
  CONSTRAINT uq_estado_susc UNIQUE (nombre)
);
CREATE TABLE IF NOT EXISTS estado_pago (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,                  -- Aprobado, Rechazado, Pendiente
  CONSTRAINT uq_estado_pago UNIQUE (nombre)
);
CREATE TABLE IF NOT EXISTS metodo_pago (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,                  -- Crédito, Débito
  CONSTRAINT uq_metodo_pago UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS suscripcion (        -- 1 plan -> N suscripciones
  id                     BIGSERIAL PRIMARY KEY,
  usuario_id             BIGINT  NOT NULL,      -- REF Usuarios
  plan_id                INTEGER NOT NULL REFERENCES plan_suscripcion(id),
  estado_suscripcion_id  INTEGER NOT NULL REFERENCES estado_suscripcion(id)
);
CREATE INDEX IF NOT EXISTS ix_susc_usuario ON suscripcion(usuario_id);

CREATE TABLE IF NOT EXISTS venta (              -- 1 suscripción -> N ventas
  id              BIGSERIAL PRIMARY KEY,
  suscripcion_id  BIGINT  NOT NULL REFERENCES suscripcion(id),
  monto           NUMERIC(14,2) NOT NULL,       -- lo realmente cobrado ese día (dato histórico)
  fecha           DATE    NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS ix_venta_susc ON venta(suscripcion_id);

CREATE TABLE IF NOT EXISTS pago (               -- 1 venta -> 1 pago
  id               BIGSERIAL PRIMARY KEY,
  venta_id         BIGINT  NOT NULL REFERENCES venta(id),
  id_transaccion   VARCHAR(255) NOT NULL,       -- lo informa la pasarela
  metodo_pago_id   INTEGER NOT NULL REFERENCES metodo_pago(id),
  estado_pago_id   INTEGER NOT NULL REFERENCES estado_pago(id),
  CONSTRAINT uq_pago_venta UNIQUE (venta_id)
);

INSERT INTO plan_suscripcion   (nombre) VALUES ('Estándar'), ('Premium') ON CONFLICT DO NOTHING;
INSERT INTO estado_suscripcion (nombre) VALUES ('Activa'), ('Vencida'), ('Cancelada') ON CONFLICT DO NOTHING;
INSERT INTO estado_pago        (nombre) VALUES ('Aprobado'), ('Rechazado'), ('Pendiente') ON CONFLICT DO NOTHING;
INSERT INTO metodo_pago        (nombre) VALUES ('Crédito'), ('Débito') ON CONFLICT DO NOTHING;
