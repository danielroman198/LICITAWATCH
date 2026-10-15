-- Migración para bases YA creadas: agrega el RUT de la persona de contacto (cambio al ER).
-- Ejecutar:  psql -U postgres -h localhost -d licitawatch_usuarios -f migracion_rut_persona.sql
-- Las cuentas creadas antes de este cambio quedan con rut_persona vacío (NULL) hasta que se vuelvan a registrar.
ALTER TABLE licitador ADD COLUMN IF NOT EXISTS rut_persona VARCHAR(12);
ALTER TABLE pyme      ADD COLUMN IF NOT EXISTS rut_persona VARCHAR(12);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_licitador_rut_persona') THEN
    ALTER TABLE licitador ADD CONSTRAINT uq_licitador_rut_persona UNIQUE (rut_persona);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_pyme_rut_persona') THEN
    ALTER TABLE pyme ADD CONSTRAINT uq_pyme_rut_persona UNIQUE (rut_persona);
  END IF;
END $$;
-- Igual que en 01_usuarios.sql la columna es obligatoria. Solo se aplica si ya no quedan cuentas sin RUT personal
-- (si quedan, se avisa y hay que completarlas antes de volver a ejecutar este script).
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM licitador WHERE rut_persona IS NULL) OR EXISTS (SELECT 1 FROM pyme WHERE rut_persona IS NULL) THEN
    RAISE NOTICE 'Hay cuentas sin rut_persona: complétalas y vuelve a ejecutar para dejar la columna NOT NULL';
  ELSE
    ALTER TABLE licitador ALTER COLUMN rut_persona SET NOT NULL;
    ALTER TABLE pyme      ALTER COLUMN rut_persona SET NOT NULL;
  END IF;
END $$;
