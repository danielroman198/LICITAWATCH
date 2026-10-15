import type { Api, FiltroLicitaciones, FiltroUsuarios, Notificacion } from '../types'
import { ApiError } from '../errors'

// Implementación real: habla con el API Gateway (Spring Cloud Gateway) en VITE_API_URL.
const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8080'
const TOKEN_KEY = 'lw_token'
function claveLeidas() { let id = ''; try { id = JSON.parse(atob((localStorage.getItem(TOKEN_KEY) ?? '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).sub } catch { /* sin sesión */ } return 'lw_notif_visto_' + id }
function leidoHasta() { try { return Number(localStorage.getItem(claveLeidas()) ?? 0) || 0 } catch { return 0 } }

const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
const setToken = (t: string | null) => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* nada */ } }

async function req<T>(method: string, path: string, body?: unknown, query?: Record<string, string | number | undefined>): Promise<T> {
  const qs = query
    ? '?' + Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&')
    : ''
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const t = getToken()
  if (t) headers.Authorization = `Bearer ${t}`
  let res: Response
  try {
    res = await fetch(`${BASE}${path}${qs === '?' ? '' : qs}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Revisa que el backend esté en ejecución.', 0)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data = text ? JSON.parse(text) : undefined
  if (!res.ok) {
    if (res.status === 401) setToken(null)
    throw new ApiError((data && (data.mensaje || data.message)) || `Error ${res.status}`, res.status)
  }
  return data as T
}

const get = <T,>(p: string, q?: Record<string, string | number | undefined>) => req<T>('GET', p, undefined, q)
const post = <T,>(p: string, b?: unknown) => req<T>('POST', p, b ?? {})

export const httpApi: Api = {
  async login(email, password) {
    const s = await post<Awaited<ReturnType<Api['login']>>>('/api/auth/login', { email, password })
    setToken(s.token)
    return s
  },
  async sesionActual() {
    if (!getToken()) return null
    try { return await get('/api/auth/me') } catch { setToken(null); return null }
  },
  async logout() { setToken(null) },
  async registrarLicitador(d) {
    const s = await post<Awaited<ReturnType<Api['login']>>>('/api/usuarios/registro/licitador', d)
    setToken(s.token)
    return s
  },
  async registrarPyme(d) {
    const s = await post<Awaited<ReturnType<Api['login']>>>('/api/usuarios/registro/pyme', d)
    setToken(s.token)
    return s
  },
  async emailDisponible(email) { return (await get<{ disponible: boolean }>('/api/usuarios/disponibilidad/email', { valor: email })).disponible },
  async rutDisponible(rut) { return (await get<{ disponible: boolean }>('/api/usuarios/disponibilidad/rut', { valor: rut })).disponible },
  async rutPersonaDisponible(rut) { return (await get<{ disponible: boolean }>('/api/usuarios/disponibilidad/rut-persona', { valor: rut })).disponible },
  consultarSii: (rut) => get(`/api/sii/${encodeURIComponent(rut)}`),
  async solicitarRecuperacion(email) { await post('/api/auth/recuperar', { email }) },
  async restablecerPassword(token, password) { await post('/api/auth/restablecer', { token, password }) },

  rubros: () => get('/api/catalogos/rubros'),
  regiones: () => get('/api/catalogos/regiones'),
  ciudades: (regionId) => get('/api/catalogos/ciudades', { regionId }),
  tamanos: () => get('/api/catalogos/tamanos'),

  actualizarPerfil: (d) => req('PUT', '/api/usuarios/perfil', d),

  licitaciones: (f?: FiltroLicitaciones) => get('/api/licitaciones', { ...f }),
  licitacion: (id) => get(`/api/licitaciones/${id}`),
  misLicitaciones: () => get('/api/licitaciones/mias'),
  crearLicitacion: (d) => post('/api/licitaciones', d),
  cerrarLicitacion: (id) => post(`/api/licitaciones/${id}/cerrar`),
  postulantes: (id) => get(`/api/licitaciones/${id}/postulantes`),
  postular: (id, mensaje) => post(`/api/licitaciones/${id}/postular`, { mensaje }),
  misPostulaciones: () => get('/api/postulaciones/mias'),
  decidirPostulacion: (id, estado) => post(`/api/postulaciones/${id}/decision`, { estado }),
  adjudicar: (id) => post(`/api/postulaciones/${id}/adjudicar`),
  resumenLicitador: () => get('/api/licitaciones/resumen/licitador'),
  resumenPyme: () => get('/api/licitaciones/resumen/pyme'),

  conversaciones: () => get('/api/chat/conversaciones'),
  mensajes: (id) => get(`/api/chat/conversaciones/${id}/mensajes`),
  enviarMensaje: (id, contenido) => post(`/api/chat/conversaciones/${id}/mensajes`, { contenido }),

  // El modelo ER de Notificaciones no guarda "leída": el estado se lleva en el navegador como "último id visto".
  async notificaciones() {
    const lista = await get<Notificacion[]>('/api/notificaciones')
    const visto = leidoHasta()
    return lista.map((n) => ({ ...n, leida: n.id <= visto }))
  },
  async marcarNotificacionesLeidas() {
    const lista = await get<Notificacion[]>('/api/notificaciones')
    const max = lista.reduce((m, n) => Math.max(m, n.id), leidoHasta())
    try { localStorage.setItem(claveLeidas(), String(max)) } catch { /* sin almacenamiento */ }
  },

  planes: () => get('/api/ventas/planes'),
  miSuscripcion: () => get('/api/ventas/suscripcion'),
  pagar: (planId, metodo, simularRechazo) => post('/api/ventas/pagos', { planId, metodo, simularRechazo: !!simularRechazo }),
  cancelarSuscripcion: () => post('/api/ventas/suscripcion/cancelar'),
  misPagos: () => get('/api/ventas/pagos/mios'),

  preguntarAsistente: (texto) => post('/api/asistente/preguntar', { texto }),

  estadisticasAdmin: () => get('/api/admin/estadisticas'),
  usuariosAdmin: (f?: FiltroUsuarios) => get('/api/admin/usuarios', { ...f }),
  async cambiarEstadoUsuario(id, activo) { await req('PATCH', `/api/admin/usuarios/${id}/estado`, { activo }) },
  async eliminarUsuario(id) { await req('DELETE', `/api/admin/usuarios/${id}`) },
  licitacionesAdmin: () => get('/api/admin/licitaciones'),
  ventasAdmin: () => get('/api/admin/ventas'),
}
