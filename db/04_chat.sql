-- LicitaWatch · BD CHAT (licitawatch_chat) · sigue el ER "API CHAT — Conversación por postulación".
-- psql -U postgres -d licitawatch_chat -f 04_chat.sql
-- postulacion_id, licitador_id, pyme_id y emisor_id son REF (ids validados por REST), no llaves foráneas.

CREATE TABLE IF NOT EXISTS conversacion (       -- una por postulación
  id              BIGSERIAL PRIMARY KEY,
  postulacion_id  BIGINT NOT NULL,              -- REF Licitaciones
  licitador_id    BIGINT NOT NULL,              -- REF Usuarios
  pyme_id         BIGINT NOT NULL,              -- REF Usuarios
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  borrada_licitador_at TIMESTAMPTZ,              -- el Licitador la eliminó (solo para él); NULL = no
  borrada_pyme_at      TIMESTAMPTZ,              -- la Pyme la eliminó (solo para ella); NULL = no
  CONSTRAINT uq_conv_postulacion UNIQUE (postulacion_id)
);

CREATE TABLE IF NOT EXISTS mensaje (            -- 1 conversación -> N mensajes
  id               BIGSERIAL PRIMARY KEY,
  conversacion_id  BIGINT NOT NULL REFERENCES conversacion(id) ON DELETE CASCADE,
  emisor_id        BIGINT NOT NULL,             -- REF Usuarios
  contenido        VARCHAR(2000) NOT NULL,
  enviado_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  leido            BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS ix_msg_conv ON mensaje(conversacion_id);
