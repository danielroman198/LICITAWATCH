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
   **Ejecuta los pasos 01–05** (recomendado): así todos los integrantes del equipo quedan con exactamente la misma estructura y los mismos ids en los catálogos.
   Si solo creas las bases, la aplicación crea las tablas sola al iniciar, pero los scripts son la referencia oficial del esquema.
3. Los microservicios se conectan por defecto a `localhost:5432` con usuario `postgres` y clave `postgres`.
   Si tu clave es otra, defínela en IntelliJ: *Run → Edit Configurations → Environment variables* → `DB_PASS=tu_clave`
   (o edita `DB_PASS` por defecto en cada `application.yml`).
4. Al iniciar por primera vez, la aplicación carga sola lo que falte: roles, catálogos (rubros, regiones, ciudades, tamaños, estados, tipos, planes, métodos de pago) y la cuenta admin `admin@licitawatch.cl` / `Admin123!`.

## ¿Ya tenías las bases creadas de antes? Ponte al día

Después de un `git pull`, ejecuta las migraciones (todas se pueden correr más de una vez sin problema):
```
psql -U postgres -d licitawatch_usuarios -f db/migracion_rut_persona.sql      # RUT personal único y obligatorio
psql -U postgres -d licitawatch_usuarios -f db/migracion_ciudades_rm.sql      # la Región Metropolitana solo tiene la ciudad Santiago
psql -U postgres -d licitawatch_usuarios -f db/migracion_foto_perfil.sql      # foto de perfil (usuario.foto)
psql -U postgres -d licitawatch_usuarios -f db/migracion_email_verificado.sql # verificación de correo al registrarse (usuario.email_verificado)
psql -U postgres -d licitawatch_chat     -f db/migracion_chat_eliminar.sql     # eliminar conversación solo para mí (conversacion.borrada_*_at)
```
Si prefieres partir de cero (se pierden los datos de prueba): borra las 5 bases y vuelve a ejecutar los pasos 2 (00 a 05).

## Modelo ER

`docs/Modelo_ER_LicitaWatch_implementado.pdf` se genera desde estos scripts. Si cambias el esquema, actualiza el `.sql`,
agrega una `migracion_*.sql` para las bases ya creadas y regenera el PDF:
```
python3 docs/er/generar_er.py     # necesita psql, PostgreSQL local y Google Chrome o Chromium
```
