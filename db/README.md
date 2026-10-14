# Base de datos PostgreSQL (sin Docker)

Los scripts siguen **tu ER** (`docs/Modelo_ER_LicitaWatch.pdf`): 5 bases; LicitAsist (Asistente) no tiene base porque es externo (Groq). Se pueden ejecutar más de una vez sin duplicar datos.

1. Instala **PostgreSQL 16** (https://www.postgresql.org/download/). Anota la contraseña del usuario `postgres` y deja el puerto 5432.
2. Crea las 5 bases (una por microservicio). Con pgAdmin (Query Tool) o con terminal:
   ```
   psql -U postgres -f db/00_crear_bases.sql
   psql -U postgres -d licitawatch_usuarios       -f db/01_usuarios.sql
   psql -U postgres -d licitawatch_licitaciones   -f db/02_licitaciones.sql
   psql -U postgres -d licitawatch_ventas         -f db/03_ventas.sql
   psql -U postgres -d licitawatch_chat           -f db/04_chat.sql
   psql -U postgres -d licitawatch_notificaciones -f db/05_notificaciones.sql
   ```
   (Los pasos 01–05 son opcionales: si solo creas las bases, la aplicación crea las tablas sola al iniciar. Los scripts sirven para revisarlas, versionarlas o crearlas a mano.)
3. Los microservicios se conectan por defecto a `localhost:5432` con usuario `postgres` y clave `postgres`.
   Si tu clave es otra, defínela en IntelliJ: *Run → Edit Configurations → Environment variables* → `DB_PASS=tu_clave`
   (o edita `DB_PASS` por defecto en cada `application.yml`).
4. Al iniciar por primera vez, la aplicación carga sola lo que falte: roles, catálogos (rubros, regiones, ciudades, tamaños, estados, tipos, planes, métodos de pago) y la cuenta admin `admin@licitawatch.cl` / `Admin123!`.
