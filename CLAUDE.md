# LicitaWatch — guía para el asistente de IA

Marketplace B2B privado de licitaciones (proyecto de título Duoc UC 2026). Roles: ADMIN, LICITADOR, PYME (plan Estándar gratis / Premium).
Idioma del producto y de los textos de la interfaz: **español de Chile**.

## Estructura
- `backend/` Java 21 + Spring Boot 3.3.4, Maven multi-módulo: `lw-common` (JWT, filtro, errores), `ms-usuarios` 8081, `ms-licitaciones` 8082, `ms-ventas` 8083, `ms-notificaciones` 8084, `ms-chat` 8085, `ms-asistente` 8086 (sin BD, Groq), `api-gateway` (8080 por defecto; en esta máquina se usa **8090** porque 8080 está ocupado).
- `frontend/` React 18 + TypeScript + Vite. `src/api/types.ts` (contrato), `src/api/mock/` (modo simulado), `src/api/http/httpApi.ts` (backend real). `.env`: `VITE_USE_MOCK` y `VITE_API_URL`.
- `db/*.sql` scripts PostgreSQL (uno por base), `docs/` ER en PDF.

## Capas por microservicio (paquetes)
`bff` (controllers + DTOs) → `bs` (servicios/negocio) → `bd` (entidades JPA + repos). `ambassador` para sistemas externos (SII, Transbank, Groq).
Los repositorios están en interfaces anidadas dentro de `Repos.java`; por eso cada `*Application` usa `@EnableJpaRepositories(considerNestedRepositories = true)`.
Errores JSON: `{"mensaje": "..."}`. Llamadas entre servicios por `/internal/**` con cabecera `X-Internal-Key`; el gateway **no** expone `/internal`.

## Base de datos (reglas del ER — no romperlas)
- 5 bases PostgreSQL: `licitawatch_usuarios|licitaciones|ventas|chat|notificaciones`. LicitAsist no tiene BD.
- Catálogos normalizados (rol, rubro, region, ciudad, tamano_empresa, estado_*, tipo_*, plan, metodo_pago…).
- Entre microservicios los ids son **REF sin llave foránea** (se validan por REST). FK solo dentro de la misma base.
- `rut` = RUT de la empresa; `rut_persona` = RUT de la persona de contacto (ambos únicos, validados con módulo 11; empresa ≥ 50.000.000, persona < 50.000.000).
- Hibernate `ddl-auto: update` está activo: **cualquier cambio de esquema debe hacerse también en `db/*.sql`** (y dar un script de migración para bases ya creadas) y actualizar el ER en `docs/`.
- Cosas que el ER no guarda: `giro`, `ultimoLogin` (se devuelven vacíos); precio/cupo del plan en `PlanInfo.java`; texto de notificaciones se deriva del tipo; «leída» vive en localStorage.

## Cómo ejecutar en local (Ubuntu)
- Compilar: `cd backend && mvn -DskipTests install`
- Levantar backend: `./iniciar-backend.sh` (logs en `logs/`), apagar: `./detener-backend.sh; pkill -f -- '-1.0.0.jar'`
- Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173 con `.env`: `VITE_USE_MOCK=false`, `VITE_API_URL=http://localhost:8090`
- PostgreSQL local: usuario `postgres`, variables `DB_URL`, `DB_USER`, `DB_PASS` (por defecto localhost:5432, postgres/postgres).
- Admin sembrado: `admin@licitawatch.cl` / `Admin123!`

## Convenciones al cambiar código
- Si cambias un endpoint o DTO: actualizar **a la vez** el backend, `src/api/types.ts`, `httpApi.ts` y `mock/mockApi.ts` (el modo simulado debe seguir funcionando).
- Después de tocar el backend: recompilar con Maven y reiniciar los servicios afectados.
- Después de tocar el frontend: `npm run typecheck` (el frontend aún no se ha verificado con tsc contra el backend real).
- Cambios pequeños y revisables; no tocar la estructura del ER sin avisar.

## Pendientes conocidos
Alertas por correo a pymes Premium según rubro, subida real de archivos (hoy solo URL), redirección real a Webpay (hoy simulado), pruebas automáticas, escena animada del login (`frontend/public/media/login-escena.svg` creada, sin conectar a `Auth.tsx`).
