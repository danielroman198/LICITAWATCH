// Contratos compartidos entre el front (mock / http) y los microservicios.
// Los nombres coinciden con los DTO de Spring Boot.

export type Rol = 'LICITADOR' | 'PYME' | 'ADMIN'
export type EstadoLicitacion = 'Abierta' | 'Cerrada' | 'Adjudicada'
export type EstadoPostulacion = 'Pendiente' | 'Aprobada' | 'Rechazada'
export type EstadoSuscripcion = 'Activa' | 'Vencida' | 'Cancelada'
export type EstadoPago = 'Aprobado' | 'Rechazado' | 'Pendiente'
export type MetodoPago = 'Crédito' | 'Débito'
export type NombrePlan = 'Estándar' | 'Premium'

export interface Catalogo {
  id: number
  nombre: string
}
export interface Ciudad extends Catalogo {
  regionId: number
}

export interface Usuario {
  id: number
  email: string
  rol: Rol
  activo: boolean          // false = bloqueada por el administrador
  emailVerificado: boolean // false = se registró pero aún no abre el enlace del correo (no puede iniciar sesión)
  createdAt: string
  ultimoLogin?: string
  foto?: string | null   // data URL JPEG 256x256; sin foto se muestran las iniciales
}

export interface Perfil {
  usuarioId: number
  razonSocial: string
  rutEmpresa: string
  rutPersona: string
  nombreContacto: string
  emailContacto: string
  telefono: string
  rubroId: number
  ciudadId: number
  tamanoEmpresaId?: number
  descripcionEmpresa: string
  sitioWeb?: string
  giro?: string
  siiValidado: boolean
  updatedAt: string
}

export interface Sesion {
  token: string
  usuario: Usuario
  perfil: Perfil
}

export interface RegistroLicitador {
  email: string
  password: string
  razonSocial: string
  rutEmpresa: string
  rutPersona: string
  nombreContacto: string
  emailContacto: string
  telefono: string
  rubroId: number
  ciudadId: number
  descripcionEmpresa: string
  sitioWeb?: string
  giro?: string
  siiValidado: boolean
}
export interface RegistroPyme extends RegistroLicitador {
  tamanoEmpresaId: number
}

export interface ConsultaSii {
  rut: string
  razonSocial: string
  giro: string
  estado: string
  inicioActividades: string
  modoPruebas: boolean
}

export interface DocumentoLicitacion {
  nombre: string
  tipo: 'PDF' | 'DOCX' | 'XLSX' | 'Otro'
  tamanoKb: number
}

export interface Licitacion {
  id: number
  licitadorId: number
  licitadorNombre: string
  titulo: string
  descripcion: string
  rubroId: number
  regionId: number
  presupuestoMin?: number
  presupuestoMax?: number
  maxPostulantes?: number
  imagenUrl?: string
  documentos: DocumentoLicitacion[]
  fechaCierre: string
  estado: EstadoLicitacion
  createdAt: string
  postulantes: number
  pymeAdjudicadaId?: number
}

export interface NuevaLicitacion {
  titulo: string
  descripcion: string
  rubroId: number
  regionId: number
  presupuestoMin?: number
  presupuestoMax?: number
  maxPostulantes?: number
  imagenUrl?: string
  documentos: DocumentoLicitacion[]
  fechaCierre: string
}

export interface FiltroLicitaciones {
  q?: string
  rubroId?: number
  regionId?: number
  estado?: EstadoLicitacion
  presupuestoMax?: number
}

export interface Postulacion {
  id: number
  licitacionId: number
  licitacionTitulo: string
  licitadorNombre: string
  pymeId: number
  pymeNombre: string
  pymeRubroId: number
  pymeTamanoId?: number
  premium: boolean
  mensaje?: string
  fecha: string
  estado: EstadoPostulacion
  adjudicada: boolean
  updatedAt: string
  conversacionId?: number
}

export interface Conversacion {
  id: number
  postulacionId: number
  licitacionId: number
  licitacionTitulo: string
  licitadorId: number
  pymeId: number
  interlocutor: string          // razón social de la otra empresa
  interlocutorRut?: string      // RUT de esa empresa (formateado)
  interlocutorRubroId?: number  // rubro de esa empresa (id del catálogo de rubros)
  interlocutorContacto?: string // persona de contacto con quien se chatea
  ultimoMensaje?: string
  ultimoAt?: string
  noLeidos: number
}

export interface Mensaje {
  id: number
  conversacionId: number
  emisorId: number
  contenido: string
  enviadoAt: string
  leido: boolean
}

export type TipoNotificacion =
  | 'Licitación publicada'
  | 'Postulación recibida'
  | 'Postulación aprobada'
  | 'Postulación rechazada'
  | 'Licitación adjudicada'
  | 'Pago confirmado'
  | 'Mensaje nuevo'

export interface Notificacion {
  id: number
  tipo: TipoNotificacion
  titulo: string
  detalle: string
  createdAt: string
  leida: boolean
}

export interface Plan {
  id: number
  nombre: NombrePlan
  precioMensual: number
  postulacionesMes: number
  descripcion: string
  beneficios: string[]
}

export interface Suscripcion {
  id: number
  usuarioId: number
  plan: Plan
  estado: EstadoSuscripcion
  fechaInicio: string
  fechaFin?: string
  postulacionesUsadas: number
}

export interface Venta {
  id: number
  usuarioId: number
  usuarioNombre: string
  plan: NombrePlan
  monto: number
  fecha: string
  metodo: MetodoPago
  estado: EstadoPago
  idTransaccion: string
}

export interface ResultadoPago {
  venta: Venta
  suscripcion?: Suscripcion
}

export interface MensajeAsistente {
  rol: 'usuario' | 'asistente'
  texto: string
  licitaciones?: Licitacion[]
}

export interface FiltroUsuarios {
  q?: string
  rol?: Rol
  estado?: 'activos' | 'bloqueados'
}

export interface UsuarioAdmin {
  usuario: Usuario
  nombre: string
  rutEmpresa?: string
  plan?: NombrePlan
}

export interface PuntoMensual {
  mes: string
  valor: number
}

export interface EstadisticasAdmin {
  usuariosTotal: number
  licitadores: number
  pymes: number
  bloqueados: number
  licitacionesTotal: number
  licitacionesAbiertas: number
  licitacionesAdjudicadas: number
  postulacionesTotal: number
  suscripcionesActivas: number
  pymesPremium: number
  pymesEstandar: number
  ingresosMes: number
  ingresosTotal: number
  registrosPorMes: PuntoMensual[]
  ingresosPorMes: PuntoMensual[]
  licitacionesPorRubro: { rubro: string; valor: number }[]
}

export interface ResumenLicitador {
  publicadas: number
  abiertas: number
  adjudicadas: number
  postulacionesRecibidas: number
  pendientes: number
  porMes: PuntoMensual[]
  recientes: Licitacion[]
}

export interface ResumenPyme {
  postulacionesTotal: number
  pendientes: number
  aprobadas: number
  rechazadas: number
  adjudicadas: number
  usadasMes: number
  limiteMes: number
  plan: NombrePlan
  porMes: PuntoMensual[]
  recomendadas: Licitacion[]
}

/** Respuesta del registro: la cuenta queda pendiente de verificar el correo y no se inicia sesión. */
export interface RegistroOk {
  email: string
  mensaje: string
}

/** Código HTTP con que el login rechaza una cuenta que aún no verifica su correo. */
export const ERROR_SIN_VERIFICAR = 428

export interface Api {
  // Autenticación
  login(email: string, password: string): Promise<Sesion>
  sesionActual(): Promise<Sesion | null>
  logout(): Promise<void>
  registrarLicitador(d: RegistroLicitador): Promise<RegistroOk>
  registrarPyme(d: RegistroPyme): Promise<RegistroOk>
  verificarCuenta(token: string): Promise<void>
  reenviarVerificacion(email: string): Promise<void>
  emailDisponible(email: string): Promise<boolean>
  rutDisponible(rut: string): Promise<boolean>
  rutPersonaDisponible(rut: string): Promise<boolean>
  consultarSii(rut: string): Promise<ConsultaSii>
  solicitarRecuperacion(email: string): Promise<void>
  restablecerPassword(token: string, password: string): Promise<void>

  // Catálogos
  rubros(): Promise<Catalogo[]>
  regiones(): Promise<Catalogo[]>
  ciudades(regionId?: number): Promise<Ciudad[]>
  tamanos(): Promise<Catalogo[]>

  // Perfil
  actualizarPerfil(d: Partial<Perfil>): Promise<Perfil>
  /** null quita la foto. */
  actualizarFoto(foto: string | null): Promise<Usuario>

  // Licitaciones
  licitaciones(f?: FiltroLicitaciones): Promise<Licitacion[]>
  licitacion(id: number): Promise<Licitacion>
  misLicitaciones(): Promise<Licitacion[]>
  crearLicitacion(d: NuevaLicitacion): Promise<Licitacion>
  cerrarLicitacion(id: number): Promise<Licitacion>
  /** Solo el Licitador dueño y solo si ninguna Pyme ha postulado (409 si ya tiene postulaciones). */
  eliminarLicitacion(id: number): Promise<void>
  postulantes(licitacionId: number): Promise<Postulacion[]>
  postular(licitacionId: number, mensaje: string): Promise<Postulacion>
  misPostulaciones(): Promise<Postulacion[]>
  decidirPostulacion(id: number, estado: 'Aprobada' | 'Rechazada'): Promise<Postulacion>
  adjudicar(postulacionId: number): Promise<Postulacion>
  resumenLicitador(): Promise<ResumenLicitador>
  resumenPyme(): Promise<ResumenPyme>

  // Chat
  conversaciones(): Promise<Conversacion[]>
  mensajes(conversacionId: number): Promise<Mensaje[]>
  enviarMensaje(conversacionId: number, contenido: string): Promise<Mensaje>
  /** Elimina la conversación solo para quien la elimina; si la otra empresa vuelve a escribir, reaparece con lo nuevo. */
  eliminarConversacion(conversacionId: number): Promise<void>

  // Notificaciones
  notificaciones(): Promise<Notificacion[]>
  marcarNotificacionesLeidas(): Promise<void>
  /** Marca una sola notificación como leída (al apretarla). */
  marcarNotificacionLeida(id: number): Promise<void>

  // Suscripciones y pagos (MS-Ventas + Ambassador Transbank)
  planes(): Promise<Plan[]>
  miSuscripcion(): Promise<Suscripcion>
  pagar(planId: number, metodo: MetodoPago, simularRechazo?: boolean): Promise<ResultadoPago>
  cancelarSuscripcion(): Promise<Suscripcion>
  misPagos(): Promise<Venta[]>

  // LicitAsist (IA)
  preguntarAsistente(texto: string): Promise<MensajeAsistente>

  // Administración
  estadisticasAdmin(): Promise<EstadisticasAdmin>
  usuariosAdmin(f?: FiltroUsuarios): Promise<UsuarioAdmin[]>
  cambiarEstadoUsuario(id: number, activo: boolean): Promise<void>
  eliminarUsuario(id: number): Promise<void>
  licitacionesAdmin(): Promise<Licitacion[]>
  ventasAdmin(): Promise<Venta[]>
}
