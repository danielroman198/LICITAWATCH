# LicitaWatch — guía para el asistente de IA

Marketplace B2B privado de licitaciones (proyecto de título Duoc UC 2026). Roles: ADMIN, LICITADOR, PYME (plan Estándar gratis / Premium).
Idioma del producto y de los textos de la interfaz: **español de Chile**.

## Estructura
- Backend: Java 21 + Spring Boot 3.3.4, Maven multi-módulo con el `pom.xml` padre en la raíz. Los microservicios de negocio están en **`microservicios/`**: una carpeta por microservicio (`usuarios/`, `licitaciones/`, `ventas/`, `notificaciones/`, `chat/`, `asistente/`) y dentro **sus capas, desplegadas por separado y cada una con su puerto** (`microservicios/<dominio>/ms-<dominio>-bff|bs|bd`):

  | Dominio | BFF | BS | BD (PostgreSQL) |
  |---|---|---|---|
  | usuarios | 8081 | 8181 | 8281 |
  | licitaciones | 8082 | 8182 | 8282 |
  | ventas | 8083 | 8183 | 8283 |
  | notificaciones | 8084 | 8184 | 8284 |
  | chat | 8085 | 8185 | 8285 |
  | asistente (sin BD, Groq) | 8086 | 8186 | — |

  Ventas tiene además **`ms-ventas-ambassador` (8383)**: único componente que habla con la pasarela de pago (Transbank); la BS de Ventas lo llama con `PasarelaCliente`.

  Más `microservicios/licitawatch-common/` (librería común: JWT, filtro, errores, `InternalClient`) y el API Gateway, aparte en `api-gateway/` en la raíz (8080 por defecto; en esta máquina se usa **8090** porque 8080 está ocupado). El gateway enruta `/api/**` a los BFF.
- `frontend/` React 18 + TypeScript + Vite. `src/api/types.ts` (contrato), `src/api/mock/` (modo simulado), `src/api/http/httpApi.ts` (backend real). `.env`: `VITE_USE_MOCK` y `VITE_API_URL`.
- `db/*.sql` scripts PostgreSQL (uno por base), `docs/` ER en PDF, `scripts/` arranque y detención del backend.

## Capas (cada una es un proceso Spring Boot aparte)
Front → API Gateway → **BFF** → **BS** → **BD** → PostgreSQL. Las capas se llaman por REST con `InternalClient` (licitawatch-common).
- **BFF** (`ms-x-bff`, paquete `bff`): controladores `/api/**`. Valida el JWT (`JwtAuthFilter`), el rol (`Auth.exigir`) y el formato de entrada (`@Valid`, records en `bff/Dto` o en el controlador); llama a la BS y devuelve su JSON tal cual (`JsonNode`). Sin lógica de negocio.
- **BS** (`ms-x-bs`, paquete `bs`; usuarios-bs tiene el paquete `ambassador` del SII y asistente-bs el cliente de Groq): reglas de negocio. Rutas `/bs/**` (las llama su BFF) e `/internal/**` (las llaman las BS de otros dominios). Llama a su BD y a la BS de otros dominios (`lw.urls.*` apuntan a los puertos 818x). La sesión le llega en las cabeceras `X-Usuario-Id`/`X-Usuario-Rol` (el `InternalClient` las reenvía solo) y se lee igual con `Auth.sesion(req)`.
- **BD** (`ms-x-bd`, paquete `bd`): entidades JPA, repos (interfaces anidadas en `Repos.java`, con `@EnableJpaRepositories(considerNestedRepositories = true)`), `Seeder` y un controlador `/bd/**` que devuelve filas planas (records `...Fila`). **Única capa con datasource.** Las operaciones que deben ser atómicas (registro usuario+perfil, decidir postulación, compra plan→suscripción→venta→pago) son un solo endpoint `@Transactional` aquí.
- **Ambassador** (`ms-ventas-ambassador`, `/ambassador/pagos`): implementaciones de `PasarelaPago` (simulada o Transbank según `PASARELA_MODO`).
- `/bs/**`, `/bd/**`, `/ambassador/**` e `/internal/**` exigen la cabecera `X-Internal-Key`; el gateway **no** expone ninguna de ellas. Errores JSON: `{"mensaje": "..."}`; `InternalClient` relanza el error de la capa llamada con el mismo código y mensaje.
- Los textos libres que van en una URL entre capas se codifican con `InternalClient.q(...)` (el cliente usa la URL tal cual).

## Base de datos (reglas del ER — no romperlas)
- 5 bases PostgreSQL: `licitawatch_usuarios|licitaciones|ventas|chat|notificaciones`. LicitAsist no tiene BD.
- Catálogos normalizados (rol, rubro, region, ciudad, tamano_empresa, estado_*, tipo_*, plan, metodo_pago…).
- Entre microservicios los ids son **REF sin llave foránea** (se validan por REST). FK solo dentro de la misma base.
- `rut` = RUT de la empresa; `rut_persona` = RUT de la persona de contacto (ambos únicos, validados con módulo 11; empresa ≥ 50.000.000, persona < 50.000.000).
- Hibernate `ddl-auto: update` está activo: **cualquier cambio de esquema debe hacerse también en `db/*.sql`** (y dar un script de migración para bases ya creadas) y actualizar el ER en `docs/`.
- Cosas que el ER no guarda: `giro`, `ultimoLogin` (se devuelven vacíos); precio/cupo del plan en `PlanInfo.java`; texto de notificaciones se deriva del tipo; «leída» vive en localStorage.

## Cómo ejecutar en local (Ubuntu)
- Compilar (en la raíz del repo): `mvn -DskipTests install`
- Levantar backend: `./scripts/iniciar-backend.sh` (arranca las 19 JVM en orden BD → Ambassador → BS → BFF → gateway, ~1 min; logs en `logs/<módulo>.log`; memoria por JVM en `JAVA_OPTS`). Apagar: `./scripts/detener-backend.sh`
- Ojo: `iniciar-backend.sh` hace `pkill -f -- '-1.0.0.jar'`; no ejecutes en la misma línea de comandos otro texto que contenga `-1.0.0.jar` (pkill mataría tu propia shell).
- Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173 con `.env`: `VITE_USE_MOCK=false`, `VITE_API_URL=http://localhost:8090`
- PostgreSQL local: usuario `postgres`, variables `DB_URL`, `DB_USER`, `DB_PASS` (por defecto localhost:5432, postgres/postgres). Solo las capas BD las usan.
- Admin sembrado: `admin@licitawatch.cl` / `Admin123!`

## Convenciones al cambiar código
- Si cambias un endpoint o DTO: actualizar **a la vez** el backend (BFF, BS y, si toca datos, BD), `src/api/types.ts`, `httpApi.ts` y `mock/mockApi.ts` (el modo simulado debe seguir funcionando).
- Después de tocar el backend: recompilar con Maven y reiniciar las capas afectadas (o todo con `./scripts/iniciar-backend.sh`).
- Después de tocar el frontend: `npm run typecheck` (el frontend aún no se ha verificado con tsc contra el backend real).
- Cambios pequeños y revisables; no tocar la estructura del ER sin avisar.

## Pendientes conocidos
Alertas por correo a pymes Premium según rubro, subida real de archivos (hoy solo URL), redirección real a Webpay (hoy simulado), pruebas automáticas, escena animada del login (`frontend/public/media/login-escena.svg` creada, sin conectar a `Auth.tsx`).
