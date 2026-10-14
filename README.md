# LicitaWatch — Marketplace privado de licitaciones B2B

Licitadores publican licitaciones (**gratis**); las Pymes postulan y pagan suscripción (**Estándar gratis · Premium $24.990/mes**).

```
licitawatch/
├─ frontend/   React 18 + TypeScript + Vite (tema claro). Modo simulado o API real.
├─ backend/    Java 21 + Spring Boot 3.3 — microservicios + API Gateway (Maven multi-módulo)
├─ db/         Scripts PostgreSQL (una BD por microservicio) + instrucciones
├─ docs/       Modelo_ER_LicitaWatch.pdf (tu ER oficial; la BD sigue este modelo)
```

## 1. Frontend (funciona solo, sin backend)
```bash
cd frontend
npm install
npm run dev          # http://localhost:5173  (VITE_USE_MOCK=true: datos simulados en el navegador)
```
Cuentas demo: `licitador@demo.cl`, `pyme@demo.cl` (Estándar), `premium@demo.cl` — clave `Demo1234!` · Admin: `admin@licitawatch.cl` / `Admin123!`.
La pantalla de login tiene botones de acceso rápido y "Restablecer datos de demostración". Los correos (bienvenida, recuperación) se ven en `/bandeja`.

**Videos con IA** (opcional): copia `hero.mp4` (Home) y `login.mp4` (mitad izquierda del login) a `frontend/public/media/`. Si no existen, se muestra una animación de respaldo (panel de la plataforma / tablet haciendo scroll).

Para usar el backend real: `.env` → `VITE_USE_MOCK=false`, `VITE_API_URL=http://localhost:8080`.

## 2. Backend (microservicios)
Cada microservicio respeta las capas **BFF → BS → BD** (`bff` = controladores REST + DTO, `bs` = reglas de negocio, `bd` = entidades/repositorios).

| Servicio | Puerto | Responsabilidad |
|---|---|---|
| api-gateway | 8080 | Puerta única, enrutamiento y CORS (`/internal/**` no se expone) |
| ms-usuarios | 8081 | Login JWT, registro (email y RUT de empresa únicos), recuperación por correo, perfil, admin (bloquear/eliminar/estadísticas), catálogos. **Ambassador SII** |
| ms-licitaciones | 8082 | Licitaciones, postulaciones (cupo por plan), aprobar (= adjudicar) / rechazar |
| ms-ventas | 8083 | Planes, suscripciones, pagos, ventas. **Ambassador Transbank** |
| ms-chat | 8085 | Conversación privada (se abre al registrarse la postulación) |
| ms-notificaciones | 8084 | Campana + correos |
| ms-asistente | 8086 | LicitAsist (Premium; Groq opcional) |

Las referencias entre servicios (usuarioId, licitacionId…) se validan por REST (`/internal/**` con `X-Internal-Key`), sin llaves foráneas entre bases.

**Requisitos**: JDK 21, PostgreSQL 16 (ver `db/README.md`), Node 20+. Sin Docker.

1. Crea las bases con `db/00_crear_bases.sql` (y opcionalmente `db/01..05`).
2. Abre `backend/pom.xml` en IntelliJ, `Maven → install` (skip tests) y ejecuta los 7 `*Application` (puertos 8080–8086).
3. Si tu clave de postgres no es `postgres`: variable de entorno `DB_PASS`.

### SII (validación de RUT de empresa)
`SII_MODO=stub` (por defecto): valida dígito verificador y entrega datos de prueba; para empresas públicas conocidas (Falabella 90.749.000-9, Codelco 61.704.000-K, Banco de Chile 97.004.000-5…) devuelve su razón social. `SII_MODO=http` + `SII_URL`/`SII_API_KEY` usa un proveedor real (adaptar el contrato en `SiiHttp`). El registro **nunca bloquea** si el SII no responde: guarda el RUT con `sii_validado=false`.

### Transbank
`PASARELA_MODO=simulado` (por defecto) reproduce Webpay (aprobado / rechazado). `PASARELA_MODO=transbank` usa el ambiente de integración de Webpay Plus, que requiere un flujo con redirección que el front aún no implementa.

## 3. Estado y limitaciones (leer antes de entregar)
- **Frontend**: compilado con esbuild y revisado visualmente en Chromium (público, 3 roles, detalle, adjudicación→chat, pago). **No se ejecutó `tsc`/`npm install`** (el entorno de desarrollo no tenía acceso al registro npm): al correr `npm install && npm run build` pueden aparecer errores de tipos menores.
- **Backend**: **no se compiló con Maven** (sin acceso a Maven Central). Se verificó sintaxis con `javac` y la lógica de RUT con Java; la integración entre servicios **no se ha probado**. Espera pequeños ajustes en el primer `mvn package`.
- Pendiente: alertas por correo a Pymes Premium por rubro, subida real de archivos (hoy solo metadatos), flujo de redirección Webpay real, tests automatizados.
- **Base de datos = tu ER** (`docs/Modelo_ER_LicitaWatch.pdf`): 5 bases (Usuarios, Licitaciones, Ventas, Chat, Notificaciones); el Asistente no tiene BD. Tablas y columnas con los nombres del ER, catálogos normalizados y REF (no FK) entre microservicios. Lo que el ER no contiene queda así: el `rut_persona` (RUT de la persona de contacto) se agregó al ER en `licitador` y `pyme`; `giro` y `ultimoLogin` se devuelven vacíos; la recuperación de contraseña usa un token firmado de 1 h (sin tabla); precio/cupo/beneficios de cada plan viven en `PlanInfo.java`; la notificación guarda solo tipo y canal (el texto sale del tipo) y el estado «leída» se guarda en el navegador.
