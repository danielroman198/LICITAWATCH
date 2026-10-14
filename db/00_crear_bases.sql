-- LicitaWatch · PostgreSQL 14+ · una base de datos por microservicio.
-- Ejecutar como superusuario (postgres):  psql -U postgres -f 00_crear_bases.sql
-- (o desde pgAdmin: Query Tool conectado a la BD "postgres")
CREATE DATABASE licitawatch_usuarios       ENCODING 'UTF8';
CREATE DATABASE licitawatch_licitaciones   ENCODING 'UTF8';
CREATE DATABASE licitawatch_ventas         ENCODING 'UTF8';
CREATE DATABASE licitawatch_chat           ENCODING 'UTF8';
CREATE DATABASE licitawatch_notificaciones ENCODING 'UTF8';
