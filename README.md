# LicitaWatch — Marketplace privado de licitaciones B2B

Licitadores publican licitaciones (**gratis**); las Pymes postulan y pagan suscripción (**Estándar gratis · Premium $24.990/mes**).

```
licitawatch/
├─ frontend/   React 18 + TypeScript + Vite (tema claro). Modo simulado o API real.
├─ api-gateway/         Entrada única al backend (Spring Cloud Gateway): enruta /api/** a los BFF
├─ microservicios/      Microservicios de negocio (Java 21 + Spring Boot 3.3)
│  ├─ usuarios/             ms-usuarios-bff · ms-usuarios-bs · ms-usuarios-bd
│  ├─ licitaciones/         ms-licitaciones-bff · ms-licitaciones-bs · ms-licitaciones-bd
│  ├─ ventas/               ms-ventas-bff · ms-ventas-bs · ms-ventas-bd · ms-ventas-ambassador
│  ├─ notificaciones/       ms-notificaciones-bff · ms-notificaciones-bs · ms-notificaciones-bd
│  ├─ chat/                 ms-chat-bff · ms-chat-bs · ms-chat-bd
│  ├─ asistente/            ms-asistente-bff · ms-asistente-bs
│  └─ licitawatch-common/   Librería común (JWT, errores, cliente entre capas)
├─ scripts/              iniciar-backend.sh · detener-backend.sh
├─ pom.xml               Maven padre: compila api-gateway/ y microservicios/
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

Para usar el backend real: `.env` → `VITE_USE_MOCK=false`, `VITE_API_URL=http://localhost:8080` (el puerto del API Gateway).

## 2. Backend (microservicios en capas BFF / BS / BD)
Cada microservicio está dividido en **3 capas desplegadas por separado, cada una con su propio puerto**:

```
Frontend → API Gateway (8080) → BFF (808x) → BS (818x) → BD (828x) → PostgreSQL
```
- **BFF** (`ms-<dominio>-bff`): recibe las peticiones del front, valida el JWT, el rol y los datos de entrada, y llama a su BS.
- **BS** (`ms-<dominio>-bs`): reglas de negocio. Llama a su BD y a la BS de otros dominios; Notificaciones envía los correos (Gmail SMTP) y Asistente consulta a Groq.
- **Ambassador de Ventas** (`ms-ventas-ambassador`, puerto **8383**): microservicio aparte y único que habla con la pasarela de pago externa (Transbank Webpay Plus). La BS de Ventas le pide los cobros y nunca conoce las credenciales del proveedor.
- **BD** (`ms-<dominio>-bd`): entidades JPA y repositorios; **única capa conectada a PostgreSQL**.

| Microservicio | BFF | BS | BD | Responsabilidad |
|---|---|---|---|---|
| api-gateway | 8080 | | | Puerta única, enrutamiento a los BFF y CORS |
| usuarios | 8081 | 8181 | 8281 | Login JWT, registro con verificación por correo, recuperación, perfil, admin, catálogos. **Ambassador SII** |
| licitaciones | 8082 | 8182 | 8282 | Licitaciones, postulaciones (cupo por plan), aprobar (= adjudicar) / rechazar |
| ventas | 8083 | 8183 | 8283 | Planes, suscripciones, pagos, ventas. **+ ms-ventas-ambassador (8383) → Transbank** |
| notificaciones | 8084 | 8184 | 8284 | Campana + correos |
| chat | 8085 | 8185 | 8285 | Conversación privada (se abre al adjudicar) |
| asistente | 8086 | 8186 | — | LicitAsist (Premium; Groq opcional). Sin BD |

Las capas internas (`/bs/**`, `/bd/**`, `/ambassador/**`) y las llamadas entre microservicios (`/internal/**`) exigen la cabecera `X-Internal-Key` y el gateway no las expone. Las referencias entre servicios (usuarioId, licitacionId…) se validan por REST, sin llaves foráneas entre bases.

**Requisitos**: JDK 21, PostgreSQL 16 (ver `db/README.md`), Node 20+. Sin Docker.

1. Crea las bases con `db/00_crear_bases.sql` (y opcionalmente `db/01..05`).
2. En la raíz del repositorio: `mvn -DskipTests install`
3. `./scripts/iniciar-backend.sh` (levanta las 19 aplicaciones en orden BD → Ambassador → BS → BFF → gateway; ~1 minuto) y `./scripts/detener-backend.sh` para apagarlas. En IntelliJ abre el `pom.xml` de la raíz como proyecto; también puedes ejecutar cada `*Application` (primero los `Bd`, luego `VentasAmbassadorApplication`, los `Bs`, los `Bff` y el gateway).
4. Si tu clave de postgres no es `postgres`: variable de entorno `DB_PASS`.

### SII (validación de RUT de empresa)
`SII_MODO=stub` (por defecto): valida dígito verificador y entrega datos de prueba; para empresas públicas conocidas (Falabella 90.749.000-9, Codelco 61.704.000-K, Banco de Chile 97.004.000-5…) devuelve su razón social. `SII_MODO=http` + `SII_URL`/`SII_API_KEY` usa un proveedor real (adaptar el contrato en `SiiHttp`). El registro **nunca bloquea** si el SII no responde: guarda el RUT con `sii_validado=false`.

### Transbank (Webpay Plus real, ambiente de integración)
El pago del plan Premium usa la API REST v1.2 de Webpay Plus con el flujo real de redirección:
1. «Pasar a Premium» → `POST /api/ventas/webpay` → la BS valida el plan y `ms-ventas-ambassador` crea la transacción en Transbank (devuelve `token` y `url`).
2. El navegador va al formulario de Webpay (POST con `token_ws`); el usuario elige tarjeta y paga **en Transbank** (LicitaWatch nunca ve la tarjeta).
3. Transbank devuelve al usuario a `/api/ventas/webpay/retorno` (BFF, ruta pública vía gateway). Con `token_ws` se **confirma** (commit) y recién ahí se registra suscripción → venta → pago (aprobado o rechazado; método Crédito/Débito según el tipo de pago que informa Transbank). Con `TBK_TOKEN` (anulado) o solo `TBK_ORDEN_COMPRA` (tiempo agotado) no hay cobro ni registro.
4. El BFF redirige a `/app/suscripcion?pago=…` y el frontend muestra el comprobante (orden de compra, código de autorización, últimos 4 dígitos). Recargar el retorno no registra dos veces (se busca la orden de compra en la BD).

Tarjetas de prueba (cualquier fecha de expiración; autenticación del banco: RUT `11.111.111-1`, clave `123`): VISA `4051 8856 0044 6623` CVV 123 → aprobada · AMEX `3700 0000 0002 032` CVV 1234 → aprobada · MASTERCARD `5186 0595 5959 0568` CVV 123 → rechazada · Redcompra `4051 8842 3993 7763` / `4511 3466 6003 7060` → aprobadas · Redcompra `5186 0085 4123 3829` → rechazada. El modal de pago las muestra.

Variables: `TBK_URL` (por defecto `https://webpay3gint.transbank.cl`), `TBK_COMMERCE_CODE` / `TBK_API_KEY` (por defecto las credenciales públicas de integración), `TBK_RETURN_URL` (el script la arma con `GATEWAY_PORT`) y `FRONTEND_URL` en el BFF de Ventas (por defecto `http://localhost:5173`). Requiere internet; sin conexión, el pago muestra «No pudimos conectar con Webpay». Para producción basta cambiar `TBK_URL` a `https://webpay3g.transbank.cl` y las credenciales que entrega Transbank.

## 3. Estado y limitaciones (leer antes de entregar)
- **Frontend**: compilado con esbuild y revisado visualmente en Chromium (público, 3 roles, detalle, adjudicación→chat, pago). **No se ejecutó `tsc`/`npm install`** (el entorno de desarrollo no tenía acceso al registro npm): al correr `npm install && npm run build` pueden aparecer errores de tipos menores.
- **Backend**: **no se compiló con Maven** (sin acceso a Maven Central). Se verificó sintaxis con `javac` y la lógica de RUT con Java; la integración entre servicios **no se ha probado**. Espera pequeños ajustes en el primer `mvn package`.
- Pendiente: alertas por correo a Pymes Premium por rubro, subida real de archivos (hoy solo metadatos), tests automatizados.
- **Base de datos = tu ER** (`docs/Modelo_ER_LicitaWatch.pdf`): 5 bases (Usuarios, Licitaciones, Ventas, Chat, Notificaciones); el Asistente no tiene BD. Tablas y columnas con los nombres del ER, catálogos normalizados y REF (no FK) entre microservicios. Lo que el ER no contiene queda así: el `rut_persona` (RUT de la persona de contacto) se agregó al ER en `licitador` y `pyme`; `giro` y `ultimoLogin` se devuelven vacíos; la recuperación de contraseña usa un token firmado de 1 h (sin tabla); precio/cupo/beneficios de cada plan viven en `PlanInfo.java`; la notificación guarda solo tipo y canal (el texto sale del tipo) y el estado «leída» se guarda en el navegador.
