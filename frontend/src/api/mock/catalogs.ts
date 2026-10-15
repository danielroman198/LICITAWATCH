import type { Catalogo, Ciudad } from '../types'

export const RUBROS: Catalogo[] = [
  'Construcción',
  'Tecnología',
  'Salud',
  'Minería',
  'Logística y Transporte',
  'Alimentos y Casino',
  'Energía',
  'Educación y Capacitación',
  'Agroindustria',
  'Servicios Profesionales',
  'Marketing y Publicidad',
  'Seguridad',
  'Mantención Industrial',
  'Textil y Vestuario',
  'Medio Ambiente y Reciclaje',
  'Telecomunicaciones',
  'Retail y Comercio',
  'Imprenta y Embalaje',
  'Turismo y Eventos',
  'Aseo y Mantención',
].map((nombre, i) => ({ id: i + 1, nombre }))

export const REGIONES: Catalogo[] = [
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Metropolitana de Santiago',
  "O'Higgins",
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
].map((nombre, i) => ({ id: i + 1, nombre }))

const CIUDADES_POR_REGION: string[][] = [
  ['Arica', 'Putre'],
  ['Iquique', 'Alto Hospicio'],
  ['Antofagasta', 'Calama', 'Tocopilla'],
  ['Copiapó', 'Vallenar'],
  ['La Serena', 'Coquimbo', 'Ovalle'],
  ['Valparaíso', 'Viña del Mar', 'Quilpué', 'San Antonio'],
  ['Santiago'],
  ['Rancagua', 'San Fernando', 'Rengo'],
  ['Talca', 'Curicó', 'Linares'],
  ['Chillán', 'San Carlos'],
  ['Concepción', 'Talcahuano', 'Los Ángeles', 'Coronel'],
  ['Temuco', 'Villarrica', 'Angol'],
  ['Valdivia', 'La Unión'],
  ['Puerto Montt', 'Osorno', 'Castro'],
  ['Coyhaique', 'Puerto Aysén'],
  ['Punta Arenas', 'Puerto Natales'],
]

export const CIUDADES: Ciudad[] = (() => {
  const out: Ciudad[] = []
  let id = 1
  CIUDADES_POR_REGION.forEach((lista, ri) => {
    lista.forEach((nombre) => out.push({ id: id++, nombre, regionId: ri + 1 }))
  })
  return out
})()

export const TAMANOS: Catalogo[] = ['Pequeña', 'Mediana', 'Grande'].map((nombre, i) => ({ id: i + 1, nombre }))

export const ciudadPorNombre = (n: string) => CIUDADES.find((c) => c.nombre === n)!.id
export const rubroPorNombre = (n: string) => RUBROS.find((r) => r.nombre === n)!.id
export const regionDeCiudad = (ciudadId: number) => CIUDADES.find((c) => c.id === ciudadId)?.regionId ?? 0
