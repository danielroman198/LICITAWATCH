-- LicitaWatch · BD USUARIOS (licitawatch_usuarios) · sigue el ER "API USUARIOS — BD normalizada".
-- Ejecutar conectado a licitawatch_usuarios:  psql -U postgres -d licitawatch_usuarios -f 01_usuarios.sql
-- PK = llave primaria · FK = llave foránea dentro de esta base · UQ = único.

-- ===== Catálogos =====
CREATE TABLE IF NOT EXISTS rol (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(30) NOT NULL,
  CONSTRAINT uq_rol_nombre UNIQUE (nombre)
);
CREATE TABLE IF NOT EXISTS rubro (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  CONSTRAINT uq_rubro_nombre UNIQUE (nombre)
);
CREATE TABLE IF NOT EXISTS region (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  CONSTRAINT uq_region_nombre UNIQUE (nombre)
);
CREATE TABLE IF NOT EXISTS ciudad (                 -- 1 región -> N ciudades
  id        SERIAL PRIMARY KEY,
  nombre    VARCHAR(255) NOT NULL,
  region_id INTEGER NOT NULL REFERENCES region(id)
);
CREATE TABLE IF NOT EXISTS tamano_empresa (         -- solo aplica a pyme
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  CONSTRAINT uq_tamano_nombre UNIQUE (nombre)
);

-- ===== Identidad =====
CREATE TABLE IF NOT EXISTS usuario (                -- 1 rol -> N usuarios
  id         BIGSERIAL PRIMARY KEY,
  email      VARCHAR(160) NOT NULL,
  password   VARCHAR(255) NOT NULL,                 -- hash bcrypt
  rol_id     INTEGER NOT NULL REFERENCES rol(id),
  activo     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuario_email UNIQUE (email)
);

-- ===== Perfiles (1 usuario -> 1 perfil) =====
CREATE TABLE IF NOT EXISTS administrador (
  id         BIGSERIAL PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  nombre     VARCHAR(255) NOT NULL,
  area       VARCHAR(255),
  CONSTRAINT uq_admin_usuario UNIQUE (usuario_id)
);
CREATE TABLE IF NOT EXISTS licitador (
  id                  BIGSERIAL PRIMARY KEY,
  usuario_id          BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  razon_social        VARCHAR(255) NOT NULL,
  rut                 VARCHAR(12)  NOT NULL,        -- RUT de la empresa, sin puntos ni guion: 76123456K
  rut_persona         VARCHAR(12)  NOT NULL,        -- RUT de la persona de contacto (persona natural)
  nombre_contacto     VARCHAR(255) NOT NULL,
  email_contacto      VARCHAR(255) NOT NULL,
  telefono            VARCHAR(20)  NOT NULL,
  rubro_id            INTEGER NOT NULL REFERENCES rubro(id),
  ciudad_id           INTEGER NOT NULL REFERENCES ciudad(id),   -- la región sale de ciudad.region_id (3FN)
  descripcion_empresa VARCHAR(2000) NOT NULL,
  sitio_web           VARCHAR(255),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_licitador_usuario UNIQUE (usuario_id),
  CONSTRAINT uq_licitador_rut UNIQUE (rut),
  CONSTRAINT uq_licitador_rut_persona UNIQUE (rut_persona)
);
CREATE TABLE IF NOT EXISTS pyme (
  id                  BIGSERIAL PRIMARY KEY,
  usuario_id          BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  razon_social        VARCHAR(255) NOT NULL,
  rut                 VARCHAR(12)  NOT NULL,        -- RUT de la empresa
  rut_persona         VARCHAR(12)  NOT NULL,        -- RUT de la persona de contacto (persona natural)
  nombre_contacto     VARCHAR(255) NOT NULL,
  email_contacto      VARCHAR(255) NOT NULL,
  telefono            VARCHAR(20)  NOT NULL,
  rubro_id            INTEGER NOT NULL REFERENCES rubro(id),
  ciudad_id           INTEGER NOT NULL REFERENCES ciudad(id),
  tamano_empresa_id   INTEGER NOT NULL REFERENCES tamano_empresa(id),
  descripcion_empresa VARCHAR(2000) NOT NULL,
  sitio_web           VARCHAR(255),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_pyme_usuario UNIQUE (usuario_id),
  CONSTRAINT uq_pyme_rut UNIQUE (rut),
  CONSTRAINT uq_pyme_rut_persona UNIQUE (rut_persona)
);

-- ===== Datos de catálogo =====
INSERT INTO rol (nombre) VALUES ('LICITADOR'), ('PYME'), ('ADMIN') ON CONFLICT DO NOTHING;
INSERT INTO tamano_empresa (nombre) VALUES ('Pequeña'), ('Mediana'), ('Grande') ON CONFLICT DO NOTHING;
INSERT INTO rubro (nombre) VALUES
  ('Aseo y Mantención'),
  ('Alimentos y Casino'),
  ('Construcción'),
  ('Educación y Capacitación'),
  ('Energía'),
  ('Logística y Transporte'),
  ('Marketing y Publicidad'),
  ('Minería'),
  ('Salud'),
  ('Seguridad'),
  ('Servicios Legales y Contables'),
  ('Tecnología'),
  ('Textil y Vestuario'),
  ('Turismo y Eventos'),
  ('Mantención Industrial'),
  ('Agricultura'),
  ('Telecomunicaciones'),
  ('Consultoría'),
  ('Medio Ambiente'),
  ('Otros')
ON CONFLICT DO NOTHING;
INSERT INTO region (nombre) VALUES
  ('Arica y Parinacota'),
  ('Tarapacá'),
  ('Antofagasta'),
  ('Atacama'),
  ('Coquimbo'),
  ('Valparaíso'),
  ('Metropolitana de Santiago'),
  ('O''Higgins'),
  ('Maule'),
  ('Ñuble'),
  ('Biobío'),
  ('La Araucanía'),
  ('Los Ríos'),
  ('Los Lagos'),
  ('Aysén'),
  ('Magallanes')
ON CONFLICT DO NOTHING;
INSERT INTO ciudad (nombre, region_id)
SELECT v.ciudad, r.id FROM (VALUES
  ('Arica', 'Arica y Parinacota'),
  ('Iquique', 'Tarapacá'),
  ('Antofagasta', 'Antofagasta'),
  ('Calama', 'Antofagasta'),
  ('Copiapó', 'Atacama'),
  ('La Serena', 'Coquimbo'),
  ('Coquimbo', 'Coquimbo'),
  ('Valparaíso', 'Valparaíso'),
  ('Viña del Mar', 'Valparaíso'),
  ('Santiago', 'Metropolitana de Santiago'),     -- la RM tiene una sola ciudad; sus comunas no se listan
  ('Rancagua', 'O''Higgins'),
  ('Talca', 'Maule'),
  ('Curicó', 'Maule'),
  ('Chillán', 'Ñuble'),
  ('Concepción', 'Biobío'),
  ('Los Ángeles', 'Biobío'),
  ('Temuco', 'La Araucanía'),
  ('Valdivia', 'Los Ríos'),
  ('Puerto Montt', 'Los Lagos'),
  ('Osorno', 'Los Lagos'),
  ('Coyhaique', 'Aysén'),
  ('Punta Arenas', 'Magallanes')
) AS v(ciudad, region) JOIN region r ON r.nombre = v.region
WHERE NOT EXISTS (SELECT 1 FROM ciudad);

-- La cuenta admin@licitawatch.cl (con su fila en administrador) la crea el microservicio ms-usuarios al iniciar,
-- porque necesita el hash bcrypt de la contraseña.
