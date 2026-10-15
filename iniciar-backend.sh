#!/bin/bash
GATEWAY_PORT=${GATEWAY_PORT:-8090}
# Configuración local del correo (SMTP). Ver correo.env.example; correo.env no se sube a GitHub.
if [ -f "$(dirname "$0")/correo.env" ]; then set -a; . "$(dirname "$0")/correo.env"; set +a; echo "Correo: usando correo.env (MAIL_ACTIVO=$MAIL_ACTIVO)"; fi
cd "$(dirname "$0")/backend" || exit 1
mkdir -p ../logs
pkill -f -- '-1.0.0.jar' 2>/dev/null; sleep 2
for s in ms-usuarios ms-notificaciones ms-licitaciones ms-ventas ms-chat ms-asistente api-gateway; do
  if [ ! -f "$s/target/$s-1.0.0.jar" ]; then echo "Falta el jar de $s (ejecuta: mvn -DskipTests install)"; exit 1; fi
  echo "Iniciando $s ..."
  if [ "$s" = "api-gateway" ]; then export PORT=$GATEWAY_PORT; fi
  nohup java -jar "$s/target/$s-1.0.0.jar" > "../logs/$s.log" 2>&1 &
  echo $! > "../logs/$s.pid"
  sleep 4
done
echo "Listo. Espera ~20 s y abre http://localhost:$GATEWAY_PORT/api/catalogos/rubros"
