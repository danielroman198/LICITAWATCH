// Utilidades de RUT chileno (módulo 11)

export function limpiarRut(rut: string): string {
  return rut.replace(/[^0-9kK]/g, '').toUpperCase()
}

export function calcularDv(cuerpo: string): string {
  let suma = 0
  let mul = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * mul
    mul = mul === 7 ? 2 : mul + 1
  }
  const r = 11 - (suma % 11)
  if (r === 11) return '0'
  if (r === 10) return 'K'
  return String(r)
}

export function validarRut(rut: string): boolean {
  const limpio = limpiarRut(rut)
  if (limpio.length < 8 || limpio.length > 9) return false
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  if (!/^\d+$/.test(cuerpo)) return false
  return calcularDv(cuerpo) === dv
}

/** 76.123.456-7 */
export function formatearRut(rut: string): string {
  const limpio = limpiarRut(rut)
  if (limpio.length < 2) return limpio
  const cuerpo = limpio.slice(0, -1)
  const dv = limpio.slice(-1)
  return cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + '-' + dv
}

/** RUT de empresa: cuerpo >= 50.000.000 */
export function esRutEmpresa(rut: string): boolean {
  const limpio = limpiarRut(rut)
  if (limpio.length < 2) return false
  return parseInt(limpio.slice(0, -1), 10) >= 50_000_000
}

/** RUT de persona natural: cuerpo < 50.000.000 */
export function esRutPersona(rut: string): boolean {
  const limpio = limpiarRut(rut)
  if (limpio.length < 2) return false
  return parseInt(limpio.slice(0, -1), 10) < 50_000_000
}
