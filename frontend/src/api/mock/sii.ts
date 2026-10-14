import type { ConsultaSii } from '../types'
import { ApiError } from '../errors'
import { calcularDv, esRutEmpresa, formatearRut, limpiarRut, validarRut } from '../../lib/rut'

// Simulación del servicio externo del SII (en producción lo reemplaza el Ambassador del backend).
// RUT públicos de empresas conocidas para probar el registro.
const CONOCIDAS: { cuerpo: string; razon: string; giro: string }[] = [
  { cuerpo: '90749000', razon: 'Falabella S.A.', giro: 'Comercio al por menor' },
  { cuerpo: '93834000', razon: 'Cencosud S.A.', giro: 'Supermercados y retail' },
  { cuerpo: '97004000', razon: 'Banco de Chile', giro: 'Servicios financieros' },
  { cuerpo: '89862200', razon: 'LATAM Airlines Group S.A.', giro: 'Transporte aéreo' },
  { cuerpo: '99520000', razon: 'Compañía de Petróleos de Chile Copec S.A.', giro: 'Combustibles y energía' },
  { cuerpo: '92580000', razon: 'Entel S.A.', giro: 'Telecomunicaciones' },
  { cuerpo: '61704000', razon: 'Corporación Nacional del Cobre de Chile', giro: 'Minería del cobre' },
  { cuerpo: '76042014', razon: 'Walmart Chile S.A.', giro: 'Supermercados' },
  { cuerpo: '90413000', razon: 'Compañía Cervecerías Unidas S.A.', giro: 'Bebidas y alimentos' },
  { cuerpo: '96792430', razon: 'Sodimac S.A.', giro: 'Construcción y mejoramiento del hogar' },
  { cuerpo: '97030000', razon: 'Banco del Estado de Chile', giro: 'Servicios financieros' },
  { cuerpo: '61219000', razon: 'Empresa de Transporte de Pasajeros Metro S.A.', giro: 'Transporte ferroviario urbano' },
]

export const RUT_DE_PRUEBA = CONOCIDAS.map((c) => formatearRut(c.cuerpo + calcularDv(c.cuerpo)))

export async function consultarSiiMock(rutEntrada: string): Promise<ConsultaSii> {
  await new Promise((r) => setTimeout(r, 650))
  if (!validarRut(rutEntrada)) throw new ApiError('El RUT no es válido (dígito verificador incorrecto).', 422)
  if (!esRutEmpresa(rutEntrada)) throw new ApiError('Ese RUT corresponde a una persona natural, ingresa el RUT de la empresa.', 422)
  const limpio = limpiarRut(rutEntrada)
  const cuerpo = limpio.slice(0, -1)
  const c = CONOCIDAS.find((x) => x.cuerpo === cuerpo)
  if (c) {
    return { rut: formatearRut(limpio), razonSocial: c.razon, giro: c.giro, estado: 'Vigente · con inicio de actividades', inicioActividades: '1990-01-01', modoPruebas: false }
  }
  // Modo pruebas: RUT con dígito verificador válido pero fuera del listado público.
  return {
    rut: formatearRut(limpio),
    razonSocial: '',
    giro: 'Actividades empresariales (modo pruebas)',
    estado: 'Vigente (modo pruebas)',
    inicioActividades: '2015-01-01',
    modoPruebas: true,
  }
}
