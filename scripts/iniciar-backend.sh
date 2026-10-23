#!/bin/bash
# Levanta el backend completo: cada microservicio en 3 capas, cada una con su puerto.
#   BD  828x  (entidades + repositorios, única capa conectada a PostgreSQL)
#   BS  818x  (reglas de negocio; llama a su BD y a la BS de otros dominios)
#   Ambassador de Ventas 8383 (único que habla con la pasarela de pago externa, Transbank)
#   BFF 808x  (lo llama el API Gateway; valida JWT y rol)
#   API Gateway 8090 en esta máquina (8080 por defecto)
GATEWAY_PORT=${GATEWAY_PORT:-8090}
# Memoria por proceso: son 19 JVM, así que cada una se limita (súbelo si tu equipo tiene RAM de sobra).
JAVA_OPTS=${JAVA_OPTS:-"-Xms48m -Xmx256m -Xss512k -XX:+UseSerialGC -XX:TieredStopAtLevel=1"}
# Configuración local del correo (SMTP). Ver correo.env.example; correo.env no se sube a GitHub.
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"   # raíz del repositorio (este script vive en scripts/)
if [ -f "$RAIZ/correo.env" ]; then set -a; . "$RAIZ/correo.env"; set +a; echo "Correo: usando correo.env (MAIL_ACTIVO=$MAIL_ACTIVO)"; fi
cd "$RAIZ" || exit 1
LOGS="$RAIZ/logs"; mkdir -p "$LOGS"
pkill -f -- '-1.0.0.jar' 2>/dev/null; sleep 2

# Ruta del jar: cada módulo vive en la carpeta de su dominio (usuarios/ms-usuarios-bd, ventas/ms-ventas-ambassador…); el gateway en la raíz.
jar() { local d; d=$(echo "$1" | sed -E 's/^ms-([a-z]+)-.*/\1/'); if [ "$1" = "api-gateway" ]; then echo "api-gateway/target/api-gateway-1.0.0.jar"; else echo "$d/$1/target/$1-1.0.0.jar"; fi; }

DOMINIOS="usuarios licitaciones ventas notificaciones chat"
BD=""; BS=""; BFF=""
for d in $DOMINIOS; do BD="$BD ms-$d-bd"; BS="$BS ms-$d-bs"; BFF="$BFF ms-$d-bff"; done
BS="$BS ms-asistente-bs"; BFF="$BFF ms-asistente-bff"; AMB="ms-ventas-ambassador"

for s in $BD $AMB $BS $BFF api-gateway; do
  if [ ! -f "$(jar $s)" ]; then echo "Falta el jar de $s (ejecuta en la raíz: mvn -DskipTests install)"; exit 1; fi
done

iniciar() {   # $1 = módulo, $2 = puerto (opcional, solo para el gateway)
  if [ -n "$2" ]; then PORT=$2 nohup java $JAVA_OPTS -jar "$(jar $1)" > "$LOGS/$1.log" 2>&1 &
  else nohup java $JAVA_OPTS -jar "$(jar $1)" > "$LOGS/$1.log" 2>&1 & fi
  echo $! > "$LOGS/$1.pid"
}
esperar() {   # espera a que cada módulo de la lista termine de arrancar (o falle)
  for s in "$@"; do
    for _ in $(seq 1 90); do
      grep -q "Started .*Application" "$LOGS/$s.log" 2>/dev/null && break
      if ! kill -0 "$(cat "$LOGS/$s.pid")" 2>/dev/null; then echo "  ✗ $s se detuvo: revisa logs/$s.log"; break; fi
      sleep 1
    done
    grep -q "Started .*Application" "$LOGS/$s.log" 2>/dev/null && echo "  ✓ $s"
  done
}

echo "Capa BD (828x) ...";  for s in $BD; do iniciar $s; done;  esperar $BD
echo "Ambassador de Ventas (8383) ..."; for s in $AMB; do iniciar $s; done; esperar $AMB
echo "Capa BS (818x) ...";  for s in $BS; do iniciar $s; done;  esperar $BS
echo "Capa BFF (808x) ..."; for s in $BFF; do iniciar $s; done; esperar $BFF
echo "API Gateway ($GATEWAY_PORT) ..."; iniciar api-gateway "$GATEWAY_PORT"; esperar api-gateway
echo "Listo. Prueba http://localhost:$GATEWAY_PORT/api/catalogos/rubros"
