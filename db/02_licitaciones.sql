-- LicitaWatch · BD LICITACIONES (licitawatch_licitaciones) · sigue el ER "API LICITACIONES — BD normalizada".
-- psql -U postgres -d licitawatch_licitaciones -f 02_licitaciones.sql
-- REF = id de otro microservicio (Usuarios): NO es llave foránea, se valida por REST.

CREATE TABLE IF NOT EXISTS estado_licitacion (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,
  CONSTRAINT uq_estado_lic UNIQUE (nombre)
);
CREATE TABLE IF NOT EXISTS estado_postulacion (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,
  CONSTRAINT uq_estado_post UNIQUE (nombre)
);
CREATE TABLE IF NOT EXISTS tipo_archivo (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,
  CONSTRAINT uq_tipo_archivo UNIQUE (nombre)
);

CREATE TABLE IF NOT EXISTS licitacion (
  id                    BIGSERIAL PRIMARY KEY,
  licitador_id          BIGINT  NOT NULL,                 -- REF Usuarios
  titulo                VARCHAR(160)  NOT NULL,
  descripcion           VARCHAR(4000) NOT NULL,
  rubro_id              INTEGER NOT NULL,                 -- REF rubro (Usuarios)
  region_id             INTEGER NOT NULL,                 -- REF region (Usuarios)
  presupuesto_min       NUMERIC(14,2),
  presupuesto_max       NUMERIC(14,2),
  max_postulantes       INTEGER,
  imagen_url            TEXT,
  archivo_url           TEXT,                             -- documento complementario opcional (el archivo va a un storage)
  archivo_nombre        VARCHAR(255),
  tipo_archivo_id       INTEGER REFERENCES tipo_archivo(id),
  fecha_cierre          DATE    NOT NULL,
  estado_licitacion_id  INTEGER NOT NULL REFERENCES estado_licitacion(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_presupuesto CHECK (presupuesto_min IS NULL OR presupuesto_max IS NULL OR presupuesto_min <= presupuesto_max)
);
CREATE INDEX IF NOT EXISTS ix_lic_licitador ON licitacion(licitador_id);
CREATE INDEX IF NOT EXISTS ix_lic_estado    ON licitacion(estado_licitacion_id);

CREATE TABLE IF NOT EXISTS postulacion (                  -- 1 licitación -> N postulaciones
  id                     BIGSERIAL PRIMARY KEY,
  licitacion_id          BIGINT  NOT NULL REFERENCES licitacion(id) ON DELETE CASCADE,
  pyme_id                BIGINT  NOT NULL,                -- REF Usuarios
  mensaje                VARCHAR(2000),
  fecha_postulacion      DATE    NOT NULL DEFAULT CURRENT_DATE,
  estado_postulacion_id  INTEGER NOT NULL REFERENCES estado_postulacion(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_post_lic_pyme UNIQUE (licitacion_id, pyme_id)
);
CREATE INDEX IF NOT EXISTS ix_post_pyme ON postulacion(pyme_id);

INSERT INTO estado_licitacion  (nombre) VALUES ('Abierta'), ('Cerrada'), ('Adjudicada') ON CONFLICT DO NOTHING;
INSERT INTO estado_postulacion (nombre) VALUES ('Pendiente'), ('Aprobada'), ('Rechazada') ON CONFLICT DO NOTHING;
INSERT INTO tipo_archivo       (nombre) VALUES ('PDF'), ('DOCX'), ('XLSX'), ('Otro') ON CONFLICT DO NOTHING;
