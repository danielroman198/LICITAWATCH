-- Migración: "Eliminar conversación" solo para quien la elimina (tabla conversacion de licitawatch_chat).
-- Se guarda cuándo la eliminó cada participante: para esa persona la conversación y los mensajes anteriores quedan ocultos;
-- si llega un mensaje nuevo, reaparece solo con lo posterior. La otra empresa no ve ningún cambio. NULL = no la ha eliminado.
-- Uso:  psql -U postgres -d licitawatch_chat -f db/migracion_chat_eliminar.sql   (se puede ejecutar más de una vez)
-- Nota: ms-chat también las crea solo al iniciar (ddl-auto: update).

ALTER TABLE conversacion ADD COLUMN IF NOT EXISTS borrada_licitador_at TIMESTAMPTZ;
ALTER TABLE conversacion ADD COLUMN IF NOT EXISTS borrada_pyme_at TIMESTAMPTZ;
