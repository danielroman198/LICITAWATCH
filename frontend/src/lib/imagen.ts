// Foto de perfil: se recorta al centro en un cuadrado y se comprime a JPEG en el navegador,
// así lo que se guarda en la base pesa ~20-40 KB sin importar el tamaño de la foto original.

export const TIPOS_FOTO = ['image/jpeg', 'image/png', 'image/webp']
const MAX_ORIGINAL = 8 * 1024 * 1024

export async function fotoCuadrada(archivo: File, lado = 256): Promise<string> {
  if (!TIPOS_FOTO.includes(archivo.type)) throw new Error('Formato no permitido. Usa una imagen JPG, PNG o WEBP.')
  if (archivo.size > MAX_ORIGINAL) throw new Error('La imagen pesa más de 8 MB. Elige una más liviana.')
  const url = URL.createObjectURL(archivo)
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => mal(new Error('No se pudo leer la imagen. Prueba con otro archivo.'))
      i.src = url
    })
    const corte = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = lado
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff' // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, lado, lado)
    ctx.drawImage(img, (img.naturalWidth - corte) / 2, (img.naturalHeight - corte) / 2, corte, corte, 0, 0, lado, lado)
    return canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}
