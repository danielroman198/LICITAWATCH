-- LicitaWatch · migración para bases ya creadas: nuevo tipo de notificación "Licitación de tu rubro".
-- Se usa cuando un Licitador publica una licitación: avisa a las Pymes del mismo rubro (campana para todas; correo solo a las Premium).
-- No cambia tablas ni columnas, solo agrega una fila al catálogo (ms-notificaciones-bd también la crea al arrancar).
-- psql -U postgres -d licitawatch_notificaciones -f migracion_tipo_licitacion_rubro.sql

INSERT INTO tipo_notificacion (nombre) VALUES ('Licitación de tu rubro') ON CONFLICT DO NOTHING;
