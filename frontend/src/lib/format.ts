const CLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
})

export const clp = (n?: number | null): string => (n == null ? '—' : CLP.format(n))

export const compacto = (n: number): string => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}M`
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
  return `$${n}`
}

export const rangoPresupuesto = (min?: number, max?: number): string => {
  if (min == null && max == null) return 'A convenir'
  if (min != null && max != null) return `${compacto(min)} – ${compacto(max)}`
  if (max != null) return `Hasta ${compacto(max)}`
  return `Desde ${compacto(min as number)}`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const fechaCorta = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}

export const fechaHora = (iso?: string): string => {
  if (!iso) return '—'
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${fechaCorta(iso)} · ${hh}:${mm}`
}

export const hace = (iso: string): string => {
  const seg = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seg < 60) return 'ahora'
  if (seg < 3600) return `hace ${Math.floor(seg / 60)} min`
  if (seg < 86400) return `hace ${Math.floor(seg / 3600)} h`
  const d = Math.floor(seg / 86400)
  return d === 1 ? 'hace 1 día' : `hace ${d} días`
}

export const diasHasta = (iso: string): number =>
  Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)

export const iniciales = (nombre: string): string =>
  nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

export const mesCorto = (d: Date): string => MESES[d.getMonth()]

export const tipoArchivo = (nombre: string): 'PDF' | 'DOCX' | 'XLSX' | 'Otro' => {
  const ext = nombre.split('.').pop()?.toLowerCase()
  if (ext === 'pdf') return 'PDF'
  if (ext === 'doc' || ext === 'docx') return 'DOCX'
  if (ext === 'xls' || ext === 'xlsx') return 'XLSX'
  return 'Otro'
}

export const validarEmail = (e: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)

export const validarPassword = (p: string): string | null => {
  if (p.length < 8) return 'Mínimo 8 caracteres'
  if (!/[A-Z]/.test(p)) return 'Debe incluir una mayúscula'
  if (!/[a-z]/.test(p)) return 'Debe incluir una minúscula'
  if (!/\d/.test(p)) return 'Debe incluir un número'
  return null
}
