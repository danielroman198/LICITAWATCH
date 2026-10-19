Coloca aquí tus videos (por ejemplo de Pexels, comprimidos a 720p y < 5 MB):

  hero.mp4      -> video del Home (publicidad / plataforma profesional)
  login.mp4     -> video del Login (encima se muestra el logo de LicitaWatch y la frase)
  registro.mp4  -> video de fondo del panel derecho del Registro (Pyme y Licitador)

Si un archivo no existe, la página muestra una animación de respaldo, así que nada se rompe:
  - Login: licitaciones llegando en vivo + logo
  - Registro: mapa de Chile con regiones que se iluminan
(src/components/layout/EscenasAuth.tsx)

Comprimir un video descargado:
  ffmpeg -i ORIGINAL.mp4 -vf scale=1280:-2 -an -c:v libx264 -crf 28 -preset slow -movflags +faststart login.mp4
