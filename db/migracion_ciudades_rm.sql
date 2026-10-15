-- Migración: la Región Metropolitana queda con una sola ciudad, Santiago.
-- Maipú, Las Condes, Providencia y Ñuñoa eran comunas de Santiago: los perfiles que las usaban pasan a Santiago
-- y luego se eliminan del catálogo. Se puede ejecutar más de una vez.
-- Uso:  psql -U postgres -d licitawatch_usuarios -f db/migracion_ciudades_rm.sql

BEGIN;

WITH rm AS (SELECT id FROM region WHERE nombre = 'Metropolitana de Santiago'),
     stgo AS (SELECT c.id FROM ciudad c JOIN rm ON c.region_id = rm.id WHERE c.nombre = 'Santiago'),
     otras AS (SELECT c.id FROM ciudad c JOIN rm ON c.region_id = rm.id WHERE c.nombre <> 'Santiago')
UPDATE licitador SET ciudad_id = (SELECT id FROM stgo) WHERE ciudad_id IN (SELECT id FROM otras);

WITH rm AS (SELECT id FROM region WHERE nombre = 'Metropolitana de Santiago'),
     stgo AS (SELECT c.id FROM ciudad c JOIN rm ON c.region_id = rm.id WHERE c.nombre = 'Santiago'),
     otras AS (SELECT c.id FROM ciudad c JOIN rm ON c.region_id = rm.id WHERE c.nombre <> 'Santiago')
UPDATE pyme SET ciudad_id = (SELECT id FROM stgo) WHERE ciudad_id IN (SELECT id FROM otras);

DELETE FROM ciudad
WHERE region_id = (SELECT id FROM region WHERE nombre = 'Metropolitana de Santiago') AND nombre <> 'Santiago';

COMMIT;
