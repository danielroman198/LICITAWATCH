import type {
  Conversacion, DocumentoLicitacion, EstadoLicitacion, EstadoPostulacion, Mensaje, MetodoPago,
  Notificacion, Perfil, Plan, Suscripcion, TipoNotificacion, Usuario, Venta,
} from '../types'
import { calcularDv, formatearRut } from '../../lib/rut'
import { REGIONES, rubroPorNombre, ciudadPorNombre } from './catalogs'

export interface UsuarioDB extends Usuario { password: string }
export interface LicitacionDB {
  id: number; licitadorId: number; titulo: string; descripcion: string; rubroId: number; regionId: number
  presupuestoMin?: number; presupuestoMax?: number; maxPostulantes?: number; imagenUrl?: string
  documentos: DocumentoLicitacion[]; fechaCierre: string; estado: EstadoLicitacion; createdAt: string; pymeAdjudicadaId?: number
}
export interface PostulacionDB {
  id: number; licitacionId: number; pymeId: number; mensaje?: string; fecha: string
  estado: EstadoPostulacion; adjudicada: boolean; updatedAt: string
}
export interface NotificacionDB extends Notificacion { usuarioId: number }
export interface SuscripcionDB extends Omit<Suscripcion, 'plan' | 'postulacionesUsadas'> { planId: number }
export interface CorreoDB { id: number; para: string; asunto: string; cuerpo: string; fecha: string; enlace?: string; etiqueta?: string }
export interface TokenDB { token: string; usuarioId: number; expira: string; usado: boolean; tipo?: 'reset' | 'verificar' }  // sin tipo = reset (datos antiguos)

export interface DB {
  version: number
  seq: Record<string, number>
  usuarios: UsuarioDB[]
  perfiles: Perfil[]
  licitaciones: LicitacionDB[]
  postulaciones: PostulacionDB[]
  // borrada*At: "eliminar conversación" solo para ese participante (oculta lo anterior a esa fecha)
  conversaciones: (Omit<Conversacion, 'interlocutor' | 'ultimoMensaje' | 'ultimoAt' | 'noLeidos' | 'licitacionTitulo'> & { borradaLicitadorAt?: string; borradaPymeAt?: string })[]
  mensajes: Mensaje[]
  notificaciones: NotificacionDB[]
  suscripciones: SuscripcionDB[]
  ventas: Venta[]
  correos: CorreoDB[]
  tokens: TokenDB[]
  sesiones: Record<string, number>
}

export const PLANES: Plan[] = [
  {
    id: 1, nombre: 'Estándar', precioMensual: 0, postulacionesMes: 3,
    descripcion: 'Para empezar a encontrar oportunidades sin costo.',
    beneficios: ['Búsqueda ilimitada de licitaciones', '3 postulaciones al mes', 'Chat con el Licitador al ser adjudicado', 'Soporte estándar'],
  },
  {
    id: 2, nombre: 'Premium', precioMensual: 24990, postulacionesMes: 7,
    descripcion: 'Más postulaciones, más visibilidad y tu asistente con IA.',
    beneficios: ['Búsqueda ilimitada de licitaciones', '7 postulaciones al mes', 'LicitAsist: asistente con inteligencia artificial', 'Prioridad de visibilidad ante los Licitadores', 'Alertas por correo de licitaciones de tu rubro', 'Insignia Premium en tu perfil', 'Soporte prioritario'],
  },
]

const KEY = 'lw_db_v4'
const DAY = 86400000
const iso = (t: number) => new Date(t).toISOString()

let cache: DB | null = null

export function loadDb(): DB {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      cache = JSON.parse(raw) as DB
      return cache
    }
  } catch { /* sin storage */ }
  cache = seed()
  saveDb()
  return cache
}

export function saveDb() {
  try { if (cache) localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* ignorar */ }
}

export function resetDb() {
  cache = seed()
  saveDb()
}

export function nextId(db: DB, tabla: string): number {
  db.seq[tabla] = (db.seq[tabla] ?? 0) + 1
  return db.seq[tabla]
}

// ---------- Datos semilla ----------
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rutDe = (cuerpo: number) => formatearRut(String(cuerpo) + calcularDv(String(cuerpo)))

function seed(): DB {
  const r = rng(2026)
  const now = Date.now()
  const db: DB = {
    version: 4, seq: {}, usuarios: [], perfiles: [], licitaciones: [], postulaciones: [], conversaciones: [],
    mensajes: [], notificaciones: [], suscripciones: [], ventas: [], correos: [], tokens: [], sesiones: {},
  }

  const addUser = (email: string, rol: Usuario['rol'], haceDias: number, activo = true): UsuarioDB => {
    const u: UsuarioDB = { id: nextId(db, 'usuario'), email, password: 'Demo1234!', rol, activo, emailVerificado: true, createdAt: iso(now - haceDias * DAY) }
    db.usuarios.push(u)
    return u
  }

  // Administrador (uso interno, sin registro)
  const admin = addUser('admin@licitawatch.cl', 'ADMIN', 200)
  admin.password = 'Admin123!'
  db.perfiles.push({
    usuarioId: admin.id, razonSocial: 'LicitaWatch', rutEmpresa: rutDe(76900100), rutPersona: rutDe(15111222),
    nombreContacto: 'Equipo LicitaWatch', emailContacto: 'admin@licitawatch.cl', telefono: '+56 2 2345 6789',
    rubroId: rubroPorNombre('Tecnología'), ciudadId: ciudadPorNombre('Santiago'), descripcionEmpresa: 'Administración de la plataforma.',
    siiValidado: true, updatedAt: iso(now),
  })

  const licitadores = [
    ['licitador@demo.cl', 'Constructora Andes SpA', 76123450, 'Construcción', 'Santiago', 'Carolina Muñoz', 'Constructora líder en obras industriales y comerciales.'],
    ['compras@mineracordillera.cl', 'Minera Cordillera Norte S.A.', 77234560, 'Minería', 'Calama', 'Rodrigo Vera', 'Operación minera con compras de servicios en faena.'],
    ['abastecimiento@retailpacifico.cl', 'Retail Pacífico S.A.', 76345670, 'Retail y Comercio', 'Viña del Mar', 'Ignacia Torres', 'Cadena de tiendas con presencia en la zona central.'],
    ['licitaciones@clinicasantaelena.cl', 'Clínica Santa Elena', 76456780, 'Salud', 'Concepción', 'Dr. Matías Rojas', 'Centro médico con servicios hospitalarios y ambulatorios.'],
    ['proyectos@energiasur.cl', 'Energía Solar del Sur Ltda.', 77567890, 'Energía', 'Temuco', 'Paula Fuentes', 'Desarrollo de proyectos de energía renovable.'],
    ['compras@logisticaaustral.cl', 'Logística Austral Ltda.', 76678900, 'Logística y Transporte', 'Puerto Montt', 'Sebastián Núñez', 'Operador logístico del sur de Chile.'],
  ]
  licitadores.forEach((l, i) => {
    const u = addUser(l[0], 'LICITADOR', 150 - i * 20)
    db.perfiles.push({
      usuarioId: u.id, razonSocial: l[1] as string, rutEmpresa: rutDe(l[2] as number), rutPersona: rutDe(12000000 + i * 1234567),
      nombreContacto: l[5] as string, emailContacto: l[0], telefono: `+56 9 ${5000 + i * 111} ${1000 + i * 321}`,
      rubroId: rubroPorNombre(l[3] as string), ciudadId: ciudadPorNombre(l[4] as string), descripcionEmpresa: l[6] as string,
      sitioWeb: 'https://www.' + (l[0].split('@')[1] ?? 'demo.cl'), giro: 'Actividades empresariales', siiValidado: true, updatedAt: iso(now - i * DAY),
    })
  })

  const pymes = [
    ['pyme@demo.cl', 'Soluciones TI Maipo SpA', 76901230, 'Tecnología', 'Santiago', 'Daniela Soto', 1],
    ['premium@demo.cl', 'Ingeniería Atacama Ltda.', 77012340, 'Construcción', 'Copiapó', 'Felipe Araya', 2],
    ['contacto@aseonorte.cl', 'Aseo Industrial Norte SpA', 76123451, 'Aseo y Mantención', 'Antofagasta', 'Marcela Pinto', 1],
    ['ventas@graficasur.cl', 'Gráfica Sur Impresos Ltda.', 77234561, 'Imprenta y Embalaje', 'Osorno', 'Tomás Gallardo', 1],
    ['ops@translagos.cl', 'Transportes Los Lagos SpA', 76345671, 'Logística y Transporte', 'Puerto Montt', 'Jaime Barría', 2],
    ['info@seguridadcentinela.cl', 'Seguridad Centinela Ltda.', 76456781, 'Seguridad', 'Santiago', 'Patricio Leiva', 2],
    ['hola@ecorecicla.cl', 'EcoRecicla Chile SpA', 77567891, 'Medio Ambiente y Reciclaje', 'Valparaíso', 'Camila Ibarra', 1],
    ['eventos@cateringvalle.cl', 'Catering Del Valle SpA', 76678901, 'Alimentos y Casino', 'Rancagua', 'Rosa Cárdenas', 2],
    ['proyectos@electromaule.cl', 'Electro Maule Ltda.', 76789012, 'Energía', 'Talca', 'Nicolás Pizarro', 2],
    ['estudio@pixelmkt.cl', 'Marketing Pixel Studio SpA', 77890123, 'Marketing y Publicidad', 'Santiago', 'Valentina Rivas', 1],
    ['contacto@consultoresbiobio.cl', 'Consultores Biobío Ltda.', 76901234, 'Servicios Profesionales', 'Concepción', 'Andrés Cifuentes', 2],
    ['taller@soldadurapacifico.cl', 'Soldaduras Pacífico SpA', 77012345, 'Mantención Industrial', 'Talcahuano', 'Héctor Meza', 1],
    ['ventas@textilesnuble.cl', 'Textiles Ñuble SpA', 76123452, 'Textil y Vestuario', 'Chillán', 'Sofía Parra', 1],
    ['agro@frutascurico.cl', 'Agro Frutas Curicó Ltda.', 77234562, 'Agroindustria', 'Curicó', 'Luis Escobar', 1],
  ] as const
  const premium: Record<string, boolean> = {}
  pymes.forEach((p, i) => {
    const bloqueada = i === 12
    const u = addUser(p[0], 'PYME', 170 - i * 11, !bloqueada)
    premium[u.id] = p[6] === 2
    db.perfiles.push({
      usuarioId: u.id, razonSocial: p[1], rutEmpresa: rutDe(p[2]), rutPersona: rutDe(13000000 + i * 987654),
      nombreContacto: p[5], emailContacto: p[0], telefono: `+56 9 ${6100 + i * 97} ${2000 + i * 211}`,
      rubroId: rubroPorNombre(p[3]), ciudadId: ciudadPorNombre(p[4]), tamanoEmpresaId: (i % 3) + 1,
      descripcionEmpresa: `${p[1]} entrega servicios de ${p[3].toLowerCase()} con foco en calidad y cumplimiento de plazos.`,
      sitioWeb: undefined, giro: 'Servicios a empresas', siiValidado: true, updatedAt: iso(now - i * DAY),
    })
  })

  // Suscripciones: todas las Pymes parten en Estándar; las Premium tienen pagos mensuales.
  const pymeIds = db.usuarios.filter((u) => u.rol === 'PYME').map((u) => u.id)
  const planMes = (i: number) => iso(now - i * 30 * DAY)
  pymeIds.forEach((uid) => {
    if (!premium[uid]) {
      db.suscripciones.push({ id: nextId(db, 'suscripcion'), usuarioId: uid, planId: 1, estado: 'Activa', fechaInicio: db.usuarios.find((u) => u.id === uid)!.createdAt })
    } else {
      const meses = 2 + Math.floor(r() * 4)
      db.suscripciones.push({ id: nextId(db, 'suscripcion'), usuarioId: uid, planId: 2, estado: 'Activa', fechaInicio: planMes(meses - 1), fechaFin: iso(now + 12 * DAY) })
      for (let m = 0; m < meses; m++) {
        const perfil = db.perfiles.find((p) => p.usuarioId === uid)!
        db.ventas.push({
          id: nextId(db, 'venta'), usuarioId: uid, usuarioNombre: perfil.razonSocial, plan: 'Premium', monto: 24990,
          fecha: planMes(m + 0.1 * (uid % 5)), metodo: (uid + m) % 3 === 0 ? 'Débito' : 'Crédito', estado: 'Aprobado',
          idTransaccion: 'TBK-' + (700000 + uid * 31 + m * 7),
        })
      }
    }
  })
  db.ventas.sort((a, b) => b.fecha.localeCompare(a.fecha))

  // Licitaciones
  const licIds = db.usuarios.filter((u) => u.rol === 'LICITADOR').map((u) => u.id)
  const plantillas: [string, string, string, string, number, number, number][] = [
    ['Construcción de bodega logística de 1.200 m²', 'Construcción', 'Metropolitana de Santiago', 'Se requiere ejecución de obra gruesa y terminaciones de bodega, incluyendo radier industrial, estructura metálica y cierre perimetral. Se evaluará experiencia en obras similares.', 45000000, 68000000, 6],
    ['Servicio de aseo y mantención de oficinas corporativas', 'Aseo y Mantención', 'Metropolitana de Santiago', 'Contrato anual de aseo diario para 3 pisos de oficinas, con insumos incluidos y personal capacitado. Disponibilidad de reemplazos.', 800000, 1400000, 5],
    ['Desarrollo de portal web y app móvil para clientes', 'Tecnología', 'Valparaíso', 'Diseño y desarrollo de portal web responsivo y aplicación móvil para autoatención de clientes, con integración a sistemas internos vía API.', 12000000, 20000000, 4],
    ['Suministro de uniformes y vestuario corporativo', 'Textil y Vestuario', 'Biobío', 'Confección y entrega de 450 uniformes corporativos, con personalización y tallas diferenciadas. Entrega parcializada en 3 hitos.', 6000000, 9500000, 3],
    ['Transporte de carga refrigerada Santiago – Antofagasta', 'Logística y Transporte', 'Antofagasta', 'Servicio mensual de transporte refrigerado con monitoreo de temperatura en ruta y seguro de carga. Frecuencia de 2 viajes semanales.', 3500000, 5200000, 5],
    ['Mantención preventiva de flota de grúas horquilla', 'Mantención Industrial', 'Biobío', 'Mantención preventiva y correctiva de 18 grúas horquilla con repuestos originales, informes técnicos y atención en sitio en menos de 24 horas.', 5000000, 8000000, 4],
    ['Servicio de seguridad privada para faenas', 'Seguridad', 'Antofagasta', 'Guardias de seguridad 24/7 con control de acceso, rondas y reportes diarios. Se exige certificación OS-10 vigente.', 9000000, 14000000, 6],
    ['Instalación de paneles solares en planta industrial', 'Energía', 'La Araucanía', 'Ingeniería, suministro e instalación de sistema fotovoltaico de 250 kWp sobre techumbre, con puesta en marcha y capacitación.', 120000000, 180000000, 3],
    ['Diseño e impresión de material corporativo', 'Imprenta y Embalaje', 'Valparaíso', 'Catálogos, folletos, papelería y packaging para lanzamiento de temporada. Se valora uso de papel certificado FSC.', 2500000, 4000000, 5],
    ['Servicio de casino y alimentación para 300 personas', 'Alimentos y Casino', "O'Higgins", 'Alimentación diaria (almuerzo y colación) para 300 trabajadores, con menú semanal rotativo y opciones saludables.', 7000000, 10500000, 4],
    ['Auditoría de sistemas y ciberseguridad', 'Servicios Profesionales', 'Metropolitana de Santiago', 'Auditoría de seguridad de infraestructura, aplicaciones y políticas, con informe ejecutivo y plan de remediación priorizado.', 8000000, 13000000, 3],
    ['Gestión integral de residuos industriales', 'Medio Ambiente y Reciclaje', 'Valparaíso', 'Retiro, transporte y disposición final de residuos industriales peligrosos y no peligrosos, con certificados de trazabilidad.', 4200000, 6800000, 4],
    ['Campaña de marketing digital para lanzamiento', 'Marketing y Publicidad', 'Metropolitana de Santiago', 'Estrategia, contenidos y pauta digital por 3 meses para el lanzamiento de una nueva línea de productos, con reportes quincenales.', 5500000, 9000000, 5],
    ['Suministro de insumos médicos para urgencias', 'Salud', 'Biobío', 'Suministro mensual de insumos médicos de uso hospitalario, con registro ISP vigente y despacho a bodega central.', 6500000, 11000000, 3],
    ['Capacitación en seguridad laboral para 120 colaboradores', 'Educación y Capacitación', 'Antofagasta', 'Programa presencial de prevención de riesgos, primeros auxilios y manejo de extintores con certificación al término.', 3000000, 5000000, 6],
    ['Ampliación de red de fibra óptica en parque industrial', 'Telecomunicaciones', 'Los Lagos', 'Tendido de 6 km de fibra óptica con canalización subterránea, mufas y certificación de enlaces.', 28000000, 42000000, 3],
    ['Mantención de áreas verdes y paisajismo', 'Aseo y Mantención', 'Valparaíso', 'Mantención mensual de 2,5 hectáreas de áreas verdes, poda, riego tecnificado y reposición de especies.', 1800000, 2900000, 4],
    ['Producción de evento corporativo de aniversario', 'Turismo y Eventos', 'Metropolitana de Santiago', 'Producción integral de evento para 400 invitados: locación, montaje, catering, audiovisual y animación.', 14000000, 22000000, 3],
  ]
  const estados: EstadoLicitacion[] = ['Abierta', 'Abierta', 'Abierta', 'Abierta', 'Adjudicada', 'Abierta', 'Abierta', 'Abierta', 'Cerrada', 'Abierta', 'Abierta', 'Adjudicada', 'Abierta', 'Abierta', 'Cerrada', 'Abierta', 'Abierta', 'Abierta']
  const regionPorNombre = (n: string) => REGIONES.find((x) => x.nombre === n)?.id ?? 1
  plantillas.forEach((p, i) => {
    const estado = estados[i]
    const cierre = estado === 'Cerrada' ? now - (3 + i) * DAY : estado === 'Adjudicada' ? now - (2 + i % 3) * DAY : now + (4 + Math.floor(r() * 24)) * DAY
    db.licitaciones.push({
      id: nextId(db, 'licitacion'), licitadorId: licIds[i % licIds.length], titulo: p[0], descripcion: p[3],
      rubroId: rubroPorNombre(p[1]), regionId: regionPorNombre(p[2]), presupuestoMin: p[4], presupuestoMax: p[5], maxPostulantes: p[6] + 4,
      documentos: i % 3 === 0 ? [{ nombre: 'Bases_tecnicas.pdf', tipo: 'PDF', tamanoKb: 420 + i * 13 }, { nombre: 'Anexo_economico.xlsx', tipo: 'XLSX', tamanoKb: 96 }] : i % 3 === 1 ? [{ nombre: 'Bases_administrativas.pdf', tipo: 'PDF', tamanoKb: 310 + i * 9 }] : [],
      fechaCierre: iso(cierre), estado, createdAt: iso(now - (6 + i * 2) * DAY),
    })
  })

  // Postulaciones
  const mensajesTipo = [
    'Contamos con experiencia comprobable en proyectos similares y disponibilidad inmediata. Adjuntamos referencias a solicitud.',
    'Podemos cumplir los plazos indicados y ofrecer una propuesta ajustada al presupuesto. Quedamos atentos a sus consultas.',
    'Somos una empresa con equipo especializado y certificaciones al día. Nos gustaría presentar nuestra propuesta técnica.',
  ]
  const duplica = new Set<string>()
  db.licitaciones.forEach((l, li) => {
    const rubroAfin = db.perfiles.filter((p) => db.usuarios.find((u) => u.id === p.usuarioId)?.rol === 'PYME' && p.rubroId === l.rubroId).map((p) => p.usuarioId)
    const otros = pymeIds.filter((id) => !rubroAfin.includes(id))
    const candidatas = [...rubroAfin, ...otros.slice(li % 6, (li % 6) + 3)].slice(0, 2 + (li % 4))
    candidatas.forEach((pid, k) => {
      const key = `${l.id}-${pid}`
      if (duplica.has(key)) return
      duplica.add(key)
      const fecha = Math.max(new Date(l.createdAt).getTime() + DAY, now - (k + 1) * DAY * (1 + (li % 4)))
      let estado: EstadoPostulacion = 'Pendiente'
      let adjudicada = false
      if (l.estado === 'Adjudicada') {
        if (k === 0) { estado = 'Aprobada'; adjudicada = true; l.pymeAdjudicadaId = pid } else estado = 'Rechazada'
      } else if (l.estado === 'Cerrada') estado = k === 0 ? 'Rechazada' : 'Pendiente'
      else if (k === 1 && li % 2 === 0) estado = 'Aprobada'
      else if (k === 2 && li % 3 === 0) estado = 'Rechazada'
      db.postulaciones.push({ id: nextId(db, 'postulacion'), licitacionId: l.id, pymeId: pid, mensaje: mensajesTipo[(li + k) % 3], fecha: iso(fecha), estado, adjudicada, updatedAt: iso(fecha) })
    })
  })

  // Chats de las adjudicadas
  db.postulaciones.filter((p) => p.adjudicada).forEach((p) => {
    const l = db.licitaciones.find((x) => x.id === p.licitacionId)!
    const cid = nextId(db, 'conversacion')
    db.conversaciones.push({ id: cid, postulacionId: p.id, licitacionId: l.id, licitadorId: l.licitadorId, pymeId: p.pymeId })
    const base = now - 2 * DAY
    const guion: [number, string][] = [
      [l.licitadorId, '¡Felicitaciones! Su postulación fue adjudicada. Coordinemos los siguientes pasos por este chat.'],
      [p.pymeId, 'Muchas gracias por la confianza. ¿Podemos agendar una reunión de inicio esta semana?'],
      [l.licitadorId, 'Perfecto, propongo el jueves a las 10:00. Les enviaré el detalle de accesos y contactos.'],
    ]
    guion.forEach(([emisor, texto], i) => {
      db.mensajes.push({ id: nextId(db, 'mensaje'), conversacionId: cid, emisorId: emisor, contenido: texto, enviadoAt: iso(base + i * 3600000 * 5), leido: i < 2 })
    })
    p.updatedAt = iso(base)
  })

  // Notificaciones iniciales
  const notif = (usuarioId: number, tipo: TipoNotificacion, titulo: string, detalle: string, haceH: number, leida = false) =>
    db.notificaciones.push({ id: nextId(db, 'notificacion'), usuarioId, tipo, titulo, detalle, createdAt: iso(now - haceH * 3600000), leida })
  const demoLic = licIds[0]
  const demoPyme = pymeIds[0]
  notif(demoLic, 'Postulación recibida', 'Nueva postulación recibida', 'Una Pyme postuló a tu licitación "Construcción de bodega logística de 1.200 m²".', 3)
  notif(demoLic, 'Mensaje nuevo', 'Mensaje nuevo', 'Tienes un mensaje nuevo de una Pyme adjudicada.', 26)
  notif(demoLic, 'Licitación publicada', 'Licitación publicada', 'Tu licitación ya es visible para las Pymes del rubro.', 98, true)
  notif(demoPyme, 'Postulación aprobada', 'Tu postulación fue aprobada', 'El Licitador aprobó tu postulación. ¡Quedas en carrera para la adjudicación!', 5)
  notif(demoPyme, 'Licitación publicada', 'Nueva licitación en tu rubro', 'Se publicó "Desarrollo de portal web y app móvil para clientes".', 30)
  notif(demoPyme, 'Postulación rechazada', 'Postulación no seleccionada', 'Tu postulación a "Auditoría de sistemas y ciberseguridad" no fue seleccionada.', 72, true)

  return db
}

export const planPorId = (id: number): Plan => PLANES.find((p) => p.id === id) ?? PLANES[0]
export type { MetodoPago }
