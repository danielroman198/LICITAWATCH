import type {
  Api, Conversacion, EstadisticasAdmin, FiltroLicitaciones, FiltroUsuarios, Licitacion, MensajeAsistente,
  MetodoPago, NuevaLicitacion, Perfil, Plan, Postulacion, PuntoMensual, RegistroLicitador, RegistroOk, RegistroPyme,
  ResumenLicitador, ResumenPyme, Sesion, Suscripcion, TipoNotificacion, Usuario, UsuarioAdmin, Venta,
} from '../types'
import { ApiError } from '../errors'
import { ERROR_SIN_VERIFICAR } from '../types'
import { CIUDADES, REGIONES, RUBROS, TAMANOS } from './catalogs'
import { PLANES, loadDb, nextId, planPorId, resetDb, saveDb, type DB, type LicitacionDB, type PostulacionDB, type UsuarioDB } from './db'
import { consultarSiiMock } from './sii'
import { formatearRut, limpiarRut, validarRut, esRutEmpresa, esRutPersona } from '../../lib/rut'
import { mesCorto, validarEmail, validarPassword } from '../../lib/format'

const TOKEN_KEY = 'lw_token'
const DAY = 86400000
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms))
const ahora = () => new Date().toISOString()
const clon = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T

function getToken() { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
function setToken(t: string | null) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch { /* nada */ } }

function actual(db: DB): Usuario & { password?: string } {
  const t = getToken()
  const id = t ? db.sesiones[t] : undefined
  const u = id ? db.usuarios.find((x) => x.id === id) : undefined
  if (!u) throw new ApiError('Tu sesión expiró. Inicia sesión nuevamente.', 401)
  if (!u.activo) throw new ApiError('Tu cuenta está bloqueada. Contacta a soporte.', 403)
  const { password: _p, ...resto } = u
  return resto
}
function exigir(db: DB, ...roles: Usuario['rol'][]) {
  const u = actual(db)
  if (!roles.includes(u.rol)) throw new ApiError('No tienes permiso para realizar esta acción.', 403)
  return u
}
const perfilDe = (db: DB, id: number): Perfil => {
  const p = db.perfiles.find((x) => x.usuarioId === id)
  if (!p) throw new ApiError('Perfil no encontrado.', 404)
  return p
}
const nombreDe = (db: DB, id: number) => db.perfiles.find((p) => p.usuarioId === id)?.razonSocial ?? 'Usuario'

function planActual(db: DB, usuarioId: number): { sub: DB['suscripciones'][number]; plan: Plan } {
  const sub = db.suscripciones.filter((s) => s.usuarioId === usuarioId && s.estado === 'Activa').sort((a, b) => b.id - a.id)[0]
  if (sub) {
    if (sub.fechaFin && new Date(sub.fechaFin).getTime() < Date.now() && sub.planId === 2) {
      sub.estado = 'Vencida'
      const nueva = { id: nextId(db, 'suscripcion'), usuarioId, planId: 1, estado: 'Activa' as const, fechaInicio: ahora() }
      db.suscripciones.push(nueva)
      saveDb()
      return { sub: nueva, plan: planPorId(1) }
    }
    return { sub, plan: planPorId(sub.planId) }
  }
  const nueva = { id: nextId(db, 'suscripcion'), usuarioId, planId: 1, estado: 'Activa' as const, fechaInicio: ahora() }
  db.suscripciones.push(nueva)
  return { sub: nueva, plan: planPorId(1) }
}

const usadasEsteMes = (db: DB, pymeId: number) => {
  const d = new Date()
  return db.postulaciones.filter((p) => {
    const f = new Date(p.fecha)
    return p.pymeId === pymeId && f.getMonth() === d.getMonth() && f.getFullYear() === d.getFullYear()
  }).length
}

function correo(db: DB, usuarioId: number, asunto: string, cuerpo: string, enlace?: string, etiqueta?: string) {
  const u = db.usuarios.find((x) => x.id === usuarioId)
  if (!u) return
  db.correos.unshift({ id: nextId(db, 'correo'), para: u.email, asunto, cuerpo, fecha: ahora(), enlace, etiqueta })
}
const nuevoToken = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12)
// Las cuentas guardadas antes de este cambio no tienen el campo: se consideran verificadas.
const verificado = (u: UsuarioDB) => u.emailVerificado !== false
function enviarVerificacion(db: DB, u: UsuarioDB) {
  const token = nuevoToken()
  db.tokens.push({ token, usuarioId: u.id, expira: new Date(Date.now() + 24 * 3600000).toISOString(), usado: false, tipo: 'verificar' })
  correo(db, u.id, 'Verifica tu cuenta de LicitaWatch',
    '¡Bienvenido a LicitaWatch! Para activar tu cuenta, confirma tu correo con este enlace (vence en 24 horas). Si no creaste esta cuenta, ignora este correo.',
    `${window.location.origin}/verificar?token=${token}`, 'Verificar mi cuenta')
}
function notificar(db: DB, usuarioId: number, tipo: TipoNotificacion, titulo: string, detalle: string, mail = true) {
  db.notificaciones.unshift({ id: nextId(db, 'notificacion'), usuarioId, tipo, titulo, detalle, createdAt: ahora(), leida: false })
  if (mail) correo(db, usuarioId, `LicitaWatch · ${titulo}`, detalle)
}

function aLicitacion(db: DB, l: LicitacionDB): Licitacion {
  return {
    ...clon(l),
    licitadorNombre: nombreDe(db, l.licitadorId),
    postulantes: db.postulaciones.filter((p) => p.licitacionId === l.id).length,
  }
}
function aPostulacion(db: DB, p: PostulacionDB): Postulacion {
  const l = db.licitaciones.find((x) => x.id === p.licitacionId)!
  const perfil = perfilDe(db, p.pymeId)
  const conv = db.conversaciones.find((c) => c.postulacionId === p.id)
  return {
    ...clon(p),
    licitacionTitulo: l.titulo,
    licitadorNombre: nombreDe(db, l.licitadorId),
    pymeNombre: perfil.razonSocial,
    pymeRubroId: perfil.rubroId,
    pymeTamanoId: perfil.tamanoEmpresaId,
    premium: planActual(db, p.pymeId).plan.nombre === 'Premium',
    conversacionId: conv?.id,
  }
}

/** Desde cuándo ve este usuario la conversación (si la eliminó, lo anterior queda oculto solo para él). */
const corte = (c: DB['conversaciones'][number], usuarioId: number) => (c.licitadorId === usuarioId ? c.borradaLicitadorAt : c.borradaPymeAt) ?? ''

function sesionDe(db: DB, usuarioId: number, token: string): Sesion {
  const u = db.usuarios.find((x) => x.id === usuarioId)!
  const { password: _p, ...usuario } = u
  return { token, usuario, perfil: clon(perfilDe(db, usuarioId)) }
}

function ultimosMeses(n: number): { clave: string; etiqueta: string; desde: number; hasta: number }[] {
  const out: { clave: string; etiqueta: string; desde: number; hasta: number }[] = []
  const hoy = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const h = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 1)
    out.push({ clave: `${d.getFullYear()}-${d.getMonth()}`, etiqueta: mesCorto(d), desde: d.getTime(), hasta: h.getTime() })
  }
  return out
}
const serie = (fechas: string[], n = 6): PuntoMensual[] =>
  ultimosMeses(n).map((m) => ({ mes: m.etiqueta, valor: fechas.filter((f) => { const t = new Date(f).getTime(); return t >= m.desde && t < m.hasta }).length }))

function registrar(db: DB, d: RegistroLicitador, rol: 'LICITADOR' | 'PYME', tamano?: number): RegistroOk {
  if (!validarEmail(d.email)) throw new ApiError('El correo no es válido.', 422)
  const errPass = validarPassword(d.password)
  if (errPass) throw new ApiError(`Contraseña insegura: ${errPass.toLowerCase()}.`, 422)
  if (!validarRut(d.rutEmpresa) || !esRutEmpresa(d.rutEmpresa)) throw new ApiError('El RUT de la empresa no es válido.', 422)
  if (!validarRut(d.rutPersona) || !esRutPersona(d.rutPersona)) throw new ApiError('El RUT de la persona no es válido.', 422)
  if (!d.siiValidado) throw new ApiError('Debes validar el RUT de la empresa con el SII antes de registrarte.', 422)
  if (db.usuarios.some((u) => u.email.toLowerCase() === d.email.toLowerCase())) throw new ApiError('Ese correo ya tiene una cuenta registrada.', 409)
  if (db.perfiles.some((p) => limpiarRut(p.rutEmpresa) === limpiarRut(d.rutEmpresa))) throw new ApiError('Ya existe una cuenta con el RUT de esa empresa.', 409)
  if (db.perfiles.some((p) => limpiarRut(p.rutPersona) === limpiarRut(d.rutPersona))) throw new ApiError('Ese RUT de persona ya está registrado.', 409)
  // "Transacción": todo o nada
  const copia = clon(db)
  try {
    const usuario: UsuarioDB = { id: nextId(db, 'usuario'), email: d.email.trim().toLowerCase(), password: d.password, rol, activo: true, emailVerificado: false, createdAt: ahora() }
    db.usuarios.push(usuario)
    db.perfiles.push({
      usuarioId: usuario.id, razonSocial: d.razonSocial.trim(), rutEmpresa: d.rutEmpresa, rutPersona: d.rutPersona,
      nombreContacto: d.nombreContacto.trim(), emailContacto: d.emailContacto.trim(), telefono: d.telefono,
      rubroId: d.rubroId, ciudadId: d.ciudadId, tamanoEmpresaId: tamano, descripcionEmpresa: d.descripcionEmpresa.trim(),
      sitioWeb: d.sitioWeb?.trim() || undefined, giro: d.giro, siiValidado: d.siiValidado, updatedAt: ahora(),
    })
    if (rol === 'PYME') db.suscripciones.push({ id: nextId(db, 'suscripcion'), usuarioId: usuario.id, planId: 1, estado: 'Activa', fechaInicio: ahora() })
    enviarVerificacion(db, usuario)
    saveDb()
    return { email: usuario.email, mensaje: 'Te enviamos un correo para verificar tu cuenta' }
  } catch (e) {
    Object.assign(db, copia)
    throw e
  }
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export const mockApi: Api & { resetDemo(): void; correos(): Promise<DB['correos']> } = {
  resetDemo() { resetDb(); setToken(null) },
  async correos() { await delay(80); return clon(loadDb().correos) },

  async login(email, password) {
    await delay(500)
    const db = loadDb()
    const u = db.usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (!u || u.password !== password) throw new ApiError('Correo o contraseña incorrectos.', 401)
    if (!u.activo) throw new ApiError('Tu cuenta fue bloqueada por el equipo de LicitaWatch. Contacta a soporte.', 403)
    if (!verificado(u)) throw new ApiError('Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.', ERROR_SIN_VERIFICAR)
    const token = 'tk_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    db.sesiones[token] = u.id
    u.ultimoLogin = ahora()
    saveDb()
    setToken(token)
    return sesionDe(db, u.id, token)
  },
  async sesionActual() {
    await delay(120)
    const db = loadDb()
    const t = getToken()
    const id = t ? db.sesiones[t] : undefined
    const u = id ? db.usuarios.find((x) => x.id === id) : undefined
    if (!t || !u || !u.activo) { setToken(null); return null }
    return sesionDe(db, u.id, t)
  },
  async logout() {
    const db = loadDb()
    const t = getToken()
    if (t) { delete db.sesiones[t]; saveDb() }
    setToken(null)
  },
  async registrarLicitador(d) { await delay(700); return registrar(loadDb(), d, 'LICITADOR') },
  async registrarPyme(d) { await delay(700); return registrar(loadDb(), d, 'PYME', d.tamanoEmpresaId) },
  async verificarCuenta(token) {
    await delay(500)
    const db = loadDb()
    const t = db.tokens.find((x) => x.token === token && x.tipo === 'verificar')
    if (!t || new Date(t.expira).getTime() < Date.now()) throw new ApiError('El enlace de verificación no es válido o ya venció. Solicita uno nuevo.', 400)
    const u = db.usuarios.find((x) => x.id === t.usuarioId)
    if (!u) throw new ApiError('El enlace de verificación no es válido.', 400)
    u.emailVerificado = true   // idempotente: abrir el enlace dos veces no es un error
    t.usado = true
    saveDb()
  },
  async reenviarVerificacion(email) {
    await delay(500)
    const db = loadDb()
    const u = db.usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (u && u.activo && !verificado(u)) { enviarVerificacion(db, u); saveDb() }
    // Respuesta idéntica exista o no la cuenta (no revela cuentas)
  },
  async emailDisponible(email) {
    await delay(250)
    return !loadDb().usuarios.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  },
  async rutDisponible(rut) {
    await delay(250)
    return !loadDb().perfiles.some((p) => limpiarRut(p.rutEmpresa) === limpiarRut(rut))
  },
  async rutPersonaDisponible(rut) {
    await delay(250)
    return !loadDb().perfiles.some((p) => limpiarRut(p.rutPersona) === limpiarRut(rut))
  },
  consultarSii: consultarSiiMock,
  async solicitarRecuperacion(email) {
    await delay(600)
    const db = loadDb()
    const u = db.usuarios.find((x) => x.email.toLowerCase() === email.trim().toLowerCase())
    if (u && u.activo) {
      const token = nuevoToken()
      db.tokens.push({ token, usuarioId: u.id, expira: new Date(Date.now() + 3600000).toISOString(), usado: false, tipo: 'reset' })
      const enlace = `${window.location.origin}/restablecer?token=${token}`
      correo(db, u.id, 'Recupera tu contraseña de LicitaWatch', 'Recibimos una solicitud para restablecer tu contraseña. Este enlace vence en 1 hora. Si no fuiste tú, ignora este correo.', enlace)
      saveDb()
    }
    // Respuesta idéntica exista o no el correo (no revela cuentas)
  },
  async restablecerPassword(token, password) {
    await delay(500)
    const db = loadDb()
    const t = db.tokens.find((x) => x.token === token && x.tipo !== 'verificar')
    if (!t || t.usado || new Date(t.expira).getTime() < Date.now()) throw new ApiError('El enlace no es válido o ya venció. Solicita uno nuevo.', 400)
    const err = validarPassword(password)
    if (err) throw new ApiError(`Contraseña insegura: ${err.toLowerCase()}.`, 422)
    const u = db.usuarios.find((x) => x.id === t.usuarioId)!
    u.password = password
    u.emailVerificado = true   // abrir el enlace del correo ya prueba que el correo es suyo
    t.usado = true
    correo(db, u.id, 'Tu contraseña fue actualizada', 'Tu contraseña de LicitaWatch se cambió correctamente.')
    saveDb()
  },

  async rubros() { await delay(60); return clon(RUBROS) },
  async regiones() { await delay(60); return clon(REGIONES) },
  async ciudades(regionId) { await delay(60); return clon(regionId ? CIUDADES.filter((c) => c.regionId === regionId) : CIUDADES) },
  async tamanos() { await delay(60); return clon(TAMANOS) },

  async actualizarPerfil(d) {
    await delay()
    const db = loadDb()
    const u = actual(db)
    const p = perfilDe(db, u.id)
    const { rutEmpresa: _a, rutPersona: _b, usuarioId: _c, siiValidado: _d, ...editable } = d
    Object.assign(p, editable, { updatedAt: ahora() })
    saveDb()
    return clon(p)
  },
  async actualizarFoto(foto) {
    await delay()
    const db = loadDb()
    const u = db.usuarios.find((x) => x.id === actual(db).id)!
    u.foto = foto
    saveDb()
    const { password: _p, ...usuario } = u
    return clon(usuario)
  },

  async licitaciones(f?: FiltroLicitaciones) {
    await delay()
    const db = loadDb()
    actual(db)
    let lista = db.licitaciones.filter((l) => (f?.estado ? l.estado === f.estado : true))
    if (f?.rubroId) lista = lista.filter((l) => l.rubroId === f.rubroId)
    if (f?.regionId) lista = lista.filter((l) => l.regionId === f.regionId)
    if (f?.presupuestoMax) lista = lista.filter((l) => (l.presupuestoMin ?? 0) <= f.presupuestoMax!)
    if (f?.q) {
      const q = norm(f.q)
      lista = lista.filter((l) => norm(l.titulo + ' ' + l.descripcion + ' ' + nombreDe(db, l.licitadorId)).includes(q))
    }
    lista.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return lista.map((l) => aLicitacion(db, l))
  },
  async licitacion(id) {
    await delay(120)
    const db = loadDb()
    actual(db)
    const l = db.licitaciones.find((x) => x.id === id)
    if (!l) throw new ApiError('La licitación no existe.', 404)
    return aLicitacion(db, l)
  },
  async misLicitaciones() {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'LICITADOR')
    return db.licitaciones.filter((l) => l.licitadorId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((l) => aLicitacion(db, l))
  },
  async crearLicitacion(d: NuevaLicitacion) {
    await delay(600)
    const db = loadDb()
    const u = exigir(db, 'LICITADOR')
    if (d.titulo.trim().length < 8) throw new ApiError('El título debe tener al menos 8 caracteres.', 422)
    if (d.presupuestoMin && d.presupuestoMax && d.presupuestoMin > d.presupuestoMax) throw new ApiError('El presupuesto mínimo no puede superar al máximo.', 422)
    if (new Date(d.fechaCierre).getTime() < Date.now()) throw new ApiError('La fecha de cierre debe ser futura.', 422)
    const l: LicitacionDB = { id: nextId(db, 'licitacion'), licitadorId: u.id, ...clon(d), estado: 'Abierta', createdAt: ahora() }
    db.licitaciones.push(l)
    notificar(db, u.id, 'Licitación publicada', 'Licitación publicada', `Tu licitación "${l.titulo}" ya es visible para las Pymes.`)
    // Aviso a las Pymes del mismo rubro: campana para todas, correo solo a las Premium (igual que el backend).
    db.perfiles.filter((p) => p.rubroId === l.rubroId && db.usuarios.find((x) => x.id === p.usuarioId)?.rol === 'PYME').forEach((p) => {
      notificar(db, p.usuarioId, 'Licitación de tu rubro', `Nueva licitación de tu rubro: ${l.titulo}`,
        `${nombreDe(db, u.id)} publicó "${l.titulo}". Revisa el detalle y postula aquí: /app/licitacion/${l.id}`, planActual(db, p.usuarioId).plan.nombre === 'Premium')
    })
    saveDb()
    return aLicitacion(db, l)
  },
  async cerrarLicitacion(id) {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'LICITADOR', 'ADMIN')
    const l = db.licitaciones.find((x) => x.id === id)
    if (!l) throw new ApiError('La licitación no existe.', 404)
    if (u.rol === 'LICITADOR' && l.licitadorId !== u.id) throw new ApiError('Solo puedes cerrar tus licitaciones.', 403)
    if (l.estado !== 'Abierta') throw new ApiError('Solo se pueden cerrar licitaciones abiertas.', 409)
    l.estado = 'Cerrada'
    saveDb()
    return aLicitacion(db, l)
  },
  async eliminarLicitacion(id) {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'LICITADOR')
    const l = db.licitaciones.find((x) => x.id === id)
    if (!l) throw new ApiError('La licitación no existe.', 404)
    if (l.licitadorId !== u.id) throw new ApiError('Solo el Licitador dueño puede eliminar esta licitación.', 403)
    const n = db.postulaciones.filter((p) => p.licitacionId === id).length
    if (n > 0) throw new ApiError(`No puedes eliminar esta licitación porque ya tiene ${n} ${n === 1 ? 'postulación' : 'postulaciones'}. Si ya no la necesitas, ciérrala para que no reciba más.`, 409)
    db.licitaciones = db.licitaciones.filter((x) => x.id !== id)
    saveDb()
  },
  async postulantes(licitacionId) {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'LICITADOR', 'ADMIN')
    const l = db.licitaciones.find((x) => x.id === licitacionId)
    if (!l) throw new ApiError('La licitación no existe.', 404)
    if (u.rol === 'LICITADOR' && l.licitadorId !== u.id) throw new ApiError('No puedes ver postulantes de otra empresa.', 403)
    return db.postulaciones.filter((p) => p.licitacionId === licitacionId).map((p) => aPostulacion(db, p))
      .sort((a, b) => Number(b.premium) - Number(a.premium) || b.fecha.localeCompare(a.fecha))
  },
  async postular(licitacionId, mensaje) {
    await delay(600)
    const db = loadDb()
    const u = exigir(db, 'PYME')
    const l = db.licitaciones.find((x) => x.id === licitacionId)
    if (!l) throw new ApiError('La licitación no existe.', 404)
    if (l.estado !== 'Abierta' || new Date(l.fechaCierre).getTime() < Date.now()) throw new ApiError('Esta licitación ya está cerrada.', 409)
    if (db.postulaciones.some((p) => p.licitacionId === l.id && p.pymeId === u.id)) throw new ApiError('Ya postulaste a esta licitación.', 409)
    if (l.maxPostulantes && db.postulaciones.filter((p) => p.licitacionId === l.id).length >= l.maxPostulantes) throw new ApiError('La licitación alcanzó el máximo de postulantes.', 409)
    const { plan } = planActual(db, u.id)
    const usadas = usadasEsteMes(db, u.id)
    if (usadas >= plan.postulacionesMes) {
      throw new ApiError(plan.nombre === 'Estándar'
        ? `Usaste tus ${plan.postulacionesMes} postulaciones de este mes. Pasa a Premium para postular hasta 7 veces.`
        : `Usaste tus ${plan.postulacionesMes} postulaciones de este mes. Se renuevan el próximo mes.`, 422)
    }
    const p: PostulacionDB = { id: nextId(db, 'postulacion'), licitacionId: l.id, pymeId: u.id, mensaje: mensaje.trim() || undefined, fecha: ahora(), estado: 'Pendiente', adjudicada: false, updatedAt: ahora() }
    db.postulaciones.push(p)
    notificar(db, l.licitadorId, 'Postulación recibida', 'Nueva postulación recibida', `${nombreDe(db, u.id)} postuló a "${l.titulo}".`)
    saveDb()
    return aPostulacion(db, p)
  },
  async misPostulaciones() {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'PYME')
    return db.postulaciones.filter((p) => p.pymeId === u.id).sort((a, b) => b.fecha.localeCompare(a.fecha)).map((p) => aPostulacion(db, p))
  },
  async decidirPostulacion(id, estado) {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'LICITADOR')
    const p = db.postulaciones.find((x) => x.id === id)
    if (!p) throw new ApiError('La postulación no existe.', 404)
    const l = db.licitaciones.find((x) => x.id === p.licitacionId)!
    if (l.licitadorId !== u.id) throw new ApiError('Solo puedes gestionar postulaciones de tus licitaciones.', 403)
    if (l.estado !== 'Abierta') throw new ApiError('La licitación ya no está abierta.', 409)
    if (p.estado !== 'Pendiente') throw new ApiError('Esta postulación ya fue evaluada.', 409)
    p.estado = estado
    p.updatedAt = ahora()
    notificar(db, p.pymeId, estado === 'Aprobada' ? 'Postulación aprobada' : 'Postulación rechazada',
      estado === 'Aprobada' ? 'Tu postulación fue aprobada' : 'Tu postulación no fue seleccionada',
      estado === 'Aprobada' ? `Aprobaron tu postulación a "${l.titulo}". Estás en carrera para la adjudicación.` : `Tu postulación a "${l.titulo}" no fue seleccionada.`)
    saveDb()
    return aPostulacion(db, p)
  },
  async adjudicar(postulacionId) {
    await delay(700)
    const db = loadDb()
    const u = exigir(db, 'LICITADOR')
    const p = db.postulaciones.find((x) => x.id === postulacionId)
    if (!p) throw new ApiError('La postulación no existe.', 404)
    const l = db.licitaciones.find((x) => x.id === p.licitacionId)!
    if (l.licitadorId !== u.id) throw new ApiError('Solo puedes adjudicar tus licitaciones.', 403)
    if (l.estado !== 'Abierta') throw new ApiError('La licitación ya fue cerrada o adjudicada.', 409)
    if (p.estado !== 'Aprobada') throw new ApiError('Primero debes aprobar la postulación para adjudicarla.', 409)
    l.estado = 'Adjudicada'
    l.pymeAdjudicadaId = p.pymeId
    p.adjudicada = true
    p.updatedAt = ahora()
    db.postulaciones.filter((x) => x.licitacionId === l.id && x.id !== p.id && x.estado === 'Pendiente').forEach((x) => {
      x.estado = 'Rechazada'
      x.updatedAt = ahora()
      notificar(db, x.pymeId, 'Postulación rechazada', 'Licitación adjudicada a otra empresa', `"${l.titulo}" fue adjudicada. Gracias por participar.`)
    })
    // Se abre automáticamente el chat entre Licitador y Pyme adjudicada
    if (!db.conversaciones.some((c) => c.postulacionId === p.id)) {
      const cid = nextId(db, 'conversacion')
      db.conversaciones.push({ id: cid, postulacionId: p.id, licitacionId: l.id, licitadorId: l.licitadorId, pymeId: p.pymeId })
      db.mensajes.push({ id: nextId(db, 'mensaje'), conversacionId: cid, emisorId: l.licitadorId, contenido: '¡Felicitaciones! Su postulación fue adjudicada. Coordinemos los siguientes pasos por este chat.', enviadoAt: ahora(), leido: false })
    }
    notificar(db, p.pymeId, 'Licitación adjudicada', '¡Te adjudicaron una licitación!', `Ganaste "${l.titulo}". Ya puedes conversar con el Licitador en el chat.`)
    notificar(db, l.licitadorId, 'Licitación adjudicada', 'Licitación adjudicada', `Adjudicaste "${l.titulo}" a ${nombreDe(db, p.pymeId)}. El chat ya está abierto.`, false)
    saveDb()
    return aPostulacion(db, p)
  },
  async resumenLicitador(): Promise<ResumenLicitador> {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'LICITADOR')
    const mias = db.licitaciones.filter((l) => l.licitadorId === u.id)
    const ids = new Set(mias.map((l) => l.id))
    const posts = db.postulaciones.filter((p) => ids.has(p.licitacionId))
    return {
      publicadas: mias.length,
      abiertas: mias.filter((l) => l.estado === 'Abierta').length,
      adjudicadas: mias.filter((l) => l.estado === 'Adjudicada').length,
      postulacionesRecibidas: posts.length,
      pendientes: posts.filter((p) => p.estado === 'Pendiente').length,
      porMes: serie(posts.map((p) => p.fecha)),
      recientes: mias.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4).map((l) => aLicitacion(db, l)),
    }
  },
  async resumenPyme(): Promise<ResumenPyme> {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'PYME')
    const perfil = perfilDe(db, u.id)
    const mias = db.postulaciones.filter((p) => p.pymeId === u.id)
    const { plan } = planActual(db, u.id)
    const yaPostule = new Set(mias.map((p) => p.licitacionId))
    const recomendadas = db.licitaciones
      .filter((l) => l.estado === 'Abierta' && !yaPostule.has(l.id))
      .sort((a, b) => Number(b.rubroId === perfil.rubroId) - Number(a.rubroId === perfil.rubroId) || a.fechaCierre.localeCompare(b.fechaCierre))
      .slice(0, 4).map((l) => aLicitacion(db, l))
    return {
      postulacionesTotal: mias.length,
      pendientes: mias.filter((p) => p.estado === 'Pendiente').length,
      aprobadas: mias.filter((p) => p.estado === 'Aprobada').length,
      rechazadas: mias.filter((p) => p.estado === 'Rechazada').length,
      adjudicadas: mias.filter((p) => p.adjudicada).length,
      usadasMes: usadasEsteMes(db, u.id),
      limiteMes: plan.postulacionesMes,
      plan: plan.nombre,
      porMes: serie(mias.map((p) => p.fecha)),
      recomendadas,
    }
  },

  async conversaciones() {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'LICITADOR', 'PYME')
    return db.conversaciones.filter((c) => c.licitadorId === u.id || c.pymeId === u.id).map((c): Conversacion => {
      const msgs = db.mensajes.filter((m) => m.conversacionId === c.id && m.enviadoAt > corte(c, u.id)).sort((a, b) => a.enviadoAt.localeCompare(b.enviadoAt))
      const ult = msgs[msgs.length - 1]
      const otro = c.licitadorId === u.id ? c.pymeId : c.licitadorId
      return {
        ...clon(c),
        licitacionTitulo: db.licitaciones.find((l) => l.id === c.licitacionId)?.titulo ?? '',
        interlocutor: nombreDe(db, otro),
        interlocutorRut: (() => { const r = db.perfiles.find((p) => p.usuarioId === otro)?.rutEmpresa; return r ? formatearRut(r) : undefined })(),
        interlocutorRubroId: db.perfiles.find((p) => p.usuarioId === otro)?.rubroId,
        interlocutorContacto: db.perfiles.find((p) => p.usuarioId === otro)?.nombreContacto,
        ultimoMensaje: ult?.contenido,
        ultimoAt: ult?.enviadoAt,
        noLeidos: msgs.filter((m) => m.emisorId !== u.id && !m.leido).length,
      }
    }).filter((c) => !(corte(db.conversaciones.find((x) => x.id === c.id)!, u.id) && !c.ultimoAt))   // eliminada y sin mensajes nuevos
      .sort((a, b) => (b.ultimoAt ?? '').localeCompare(a.ultimoAt ?? ''))
  },
  async mensajes(conversacionId) {
    await delay(100)
    const db = loadDb()
    const u = exigir(db, 'LICITADOR', 'PYME')
    const c = db.conversaciones.find((x) => x.id === conversacionId)
    if (!c || (c.licitadorId !== u.id && c.pymeId !== u.id)) throw new ApiError('No tienes acceso a esta conversación.', 403)
    let cambio = false
    const visibles = db.mensajes.filter((m) => m.conversacionId === c.id && m.enviadoAt > corte(c, u.id))
    visibles.filter((m) => m.emisorId !== u.id && !m.leido).forEach((m) => { m.leido = true; cambio = true })
    if (cambio) saveDb()
    return clon(visibles.sort((a, b) => a.enviadoAt.localeCompare(b.enviadoAt)))
  },
  async eliminarConversacion(conversacionId) {
    await delay(300)
    const db = loadDb()
    const u = exigir(db, 'LICITADOR', 'PYME')
    const c = db.conversaciones.find((x) => x.id === conversacionId)
    if (!c || (c.licitadorId !== u.id && c.pymeId !== u.id)) throw new ApiError('No tienes acceso a esta conversación.', 403)
    if (c.licitadorId === u.id) c.borradaLicitadorAt = ahora(); else c.borradaPymeAt = ahora()
    saveDb()
  },
  async enviarMensaje(conversacionId, contenido) {
    await delay(150)
    const db = loadDb()
    const u = exigir(db, 'LICITADOR', 'PYME')
    const c = db.conversaciones.find((x) => x.id === conversacionId)
    if (!c || (c.licitadorId !== u.id && c.pymeId !== u.id)) throw new ApiError('No tienes acceso a esta conversación.', 403)
    const texto = contenido.trim()
    if (!texto) throw new ApiError('Escribe un mensaje.', 422)
    const m = { id: nextId(db, 'mensaje'), conversacionId: c.id, emisorId: u.id, contenido: texto, enviadoAt: ahora(), leido: false }
    db.mensajes.push(m)
    notificar(db, c.licitadorId === u.id ? c.pymeId : c.licitadorId, 'Mensaje nuevo', 'Mensaje nuevo', `${nombreDe(db, u.id)}: ${texto.slice(0, 80)}`, false)
    saveDb()
    return clon(m)
  },

  async notificaciones() {
    await delay(100)
    const db = loadDb()
    const u = actual(db)
    return clon(db.notificaciones.filter((n) => n.usuarioId === u.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(({ usuarioId: _u, ...n }) => n))
  },
  async marcarNotificacionesLeidas() {
    const db = loadDb()
    const u = actual(db)
    db.notificaciones.filter((n) => n.usuarioId === u.id).forEach((n) => { n.leida = true })
    saveDb()
  },
  async marcarNotificacionLeida(id) {
    const db = loadDb()
    const u = actual(db)
    const n = db.notificaciones.find((x) => x.id === id && x.usuarioId === u.id)
    if (n) { n.leida = true; saveDb() }
  },

  async planes() { await delay(80); return clon(PLANES) },
  async miSuscripcion(): Promise<Suscripcion> {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'PYME')
    const { sub, plan } = planActual(db, u.id)
    saveDb()
    return { id: sub.id, usuarioId: u.id, plan: clon(plan), estado: sub.estado, fechaInicio: sub.fechaInicio, fechaFin: sub.fechaFin, postulacionesUsadas: usadasEsteMes(db, u.id) }
  },
  // Modo simulado: no hay Transbank, así que se aprueba al tiro y se "vuelve" a la página de suscripción como lo haría Webpay.
  async iniciarPagoWebpay(planId) {
    await delay(900)
    const db = loadDb()
    const u = exigir(db, 'PYME')
    const plan = planPorId(planId)
    if (plan.precioMensual <= 0) throw new ApiError('El plan Estándar es gratuito.', 400)
    const orden = `LW${u.id}-${Date.now()}`, autorizacion = String(Math.floor(1000 + Math.random() * 8999))
    const venta: Venta = {
      id: nextId(db, 'venta'), usuarioId: u.id, usuarioNombre: nombreDe(db, u.id), plan: plan.nombre, monto: plan.precioMensual,
      fecha: ahora(), metodo: 'Crédito', estado: 'Aprobado', idTransaccion: orden,
    }
    db.ventas.unshift(venta)
    db.suscripciones.filter((s) => s.usuarioId === u.id && s.estado === 'Activa').forEach((s) => { s.estado = 'Cancelada' })
    db.suscripciones.push({ id: nextId(db, 'suscripcion'), usuarioId: u.id, planId: plan.id, estado: 'Activa', fechaInicio: ahora(), fechaFin: new Date(Date.now() + 30 * DAY).toISOString() })
    notificar(db, u.id, 'Pago confirmado', 'Pago confirmado', `Tu suscripción ${plan.nombre} está activa. Orden de compra ${orden}.`)
    saveDb()
    const q = new URLSearchParams({ pago: 'aprobado', ordenCompra: orden, monto: String(plan.precioMensual), metodo: 'Crédito', plan: plan.nombre, codigoAutorizacion: autorizacion, ultimos4: '6623', cuotas: '0' })
    return { token: '', url: `/app/suscripcion?${q}`, ordenCompra: orden, monto: plan.precioMensual }
  },
  async cancelarSuscripcion() {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'PYME')
    db.suscripciones.filter((s) => s.usuarioId === u.id && s.estado === 'Activa').forEach((s) => { s.estado = 'Cancelada' })
    db.suscripciones.push({ id: nextId(db, 'suscripcion'), usuarioId: u.id, planId: 1, estado: 'Activa', fechaInicio: ahora() })
    saveDb()
    return mockApi.miSuscripcion()
  },
  async misPagos() {
    await delay()
    const db = loadDb()
    const u = exigir(db, 'PYME')
    return clon(db.ventas.filter((v) => v.usuarioId === u.id))
  },

  async preguntarAsistente(texto): Promise<MensajeAsistente> {
    await delay(900)
    const db = loadDb()
    const u = exigir(db, 'PYME')
    if (planActual(db, u.id).plan.nombre !== 'Premium') throw new ApiError('LicitAsist es un beneficio del plan Premium.', 403)
    const q = norm(texto)
    const perfil = perfilDe(db, u.id)
    const abiertas = db.licitaciones.filter((l) => l.estado === 'Abierta')
    let hallazgos = abiertas
    const rubro = RUBROS.find((r) => norm(r.nombre).split(/[ ,y]+/).some((w) => w.length > 4 && q.includes(w)))
    const region = REGIONES.find((r) => q.includes(norm(r.nombre).split(' ')[0]))
    const buscaMias = /mi rubro|mi giro|para mi|me conviene|recomien/.test(q)
    if (rubro) hallazgos = hallazgos.filter((l) => l.rubroId === rubro.id)
    else if (buscaMias) hallazgos = hallazgos.filter((l) => l.rubroId === perfil.rubroId)
    if (region) hallazgos = hallazgos.filter((l) => l.regionId === region.id)
    if (/pronto|cierr|urgente/.test(q)) hallazgos = [...hallazgos].sort((a, b) => a.fechaCierre.localeCompare(b.fechaCierre))
    if (/(como|cómo).*(postul|funciona)/.test(q)) {
      return { rol: 'asistente', texto: 'Para postular: 1) busca una licitación abierta, 2) revisa las bases, 3) presiona "Postular" y cuenta por qué tu empresa es la mejor opción. El Licitador aprobará o rechazará tu postulación y, si te adjudican, se abrirá un chat con él automáticamente.' }
    }
    if (/plan|premium|limite|límite|cuantas|cuántas/.test(q)) {
      return { rol: 'asistente', texto: `Tu plan Premium incluye hasta 7 postulaciones al mes. Este mes llevas ${usadasEsteMes(db, u.id)}. Se renuevan automáticamente cada mes.` }
    }
    if (hallazgos.length === 0) {
      return { rol: 'asistente', texto: 'No encontré licitaciones abiertas con esos criterios. Prueba con otro rubro o región, o pregúntame por "las que cierran pronto".' }
    }
    const top = hallazgos.slice(0, 3).map((l) => aLicitacion(db, l))
    return {
      rol: 'asistente',
      texto: `Encontré ${hallazgos.length} licitación${hallazgos.length === 1 ? '' : 'es'} abierta${hallazgos.length === 1 ? '' : 's'}${rubro ? ` en ${rubro.nombre}` : ''}${region ? ` en la región ${region.nombre}` : ''}. Estas son las más relevantes:`,
      licitaciones: top,
    }
  },

  async estadisticasAdmin(): Promise<EstadisticasAdmin> {
    await delay()
    const db = loadDb()
    exigir(db, 'ADMIN')
    const noAdmin = db.usuarios.filter((u) => u.rol !== 'ADMIN')
    const pymes = noAdmin.filter((u) => u.rol === 'PYME')
    const premium = pymes.filter((u) => planActual(db, u.id).plan.nombre === 'Premium').length
    const hoy = new Date()
    const aprobadas = db.ventas.filter((v) => v.estado === 'Aprobado')
    const meses = ultimosMeses(6)
    const porRubro = RUBROS.map((r) => ({ rubro: r.nombre, valor: db.licitaciones.filter((l) => l.rubroId === r.id).length })).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor).slice(0, 6)
    return {
      usuariosTotal: noAdmin.length,
      licitadores: noAdmin.filter((u) => u.rol === 'LICITADOR').length,
      pymes: pymes.length,
      bloqueados: noAdmin.filter((u) => !u.activo).length,
      licitacionesTotal: db.licitaciones.length,
      licitacionesAbiertas: db.licitaciones.filter((l) => l.estado === 'Abierta').length,
      licitacionesAdjudicadas: db.licitaciones.filter((l) => l.estado === 'Adjudicada').length,
      postulacionesTotal: db.postulaciones.length,
      suscripcionesActivas: premium,
      pymesPremium: premium,
      pymesEstandar: pymes.length - premium,
      ingresosMes: aprobadas.filter((v) => { const d = new Date(v.fecha); return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear() }).reduce((s, v) => s + v.monto, 0),
      ingresosTotal: aprobadas.reduce((s, v) => s + v.monto, 0),
      registrosPorMes: serie(noAdmin.map((u) => u.createdAt)),
      ingresosPorMes: meses.map((m) => ({ mes: m.etiqueta, valor: aprobadas.filter((v) => { const t = new Date(v.fecha).getTime(); return t >= m.desde && t < m.hasta }).reduce((s, v) => s + v.monto, 0) })),
      licitacionesPorRubro: porRubro,
    }
  },
  async usuariosAdmin(f?: FiltroUsuarios): Promise<UsuarioAdmin[]> {
    await delay()
    const db = loadDb()
    exigir(db, 'ADMIN')
    let lista = db.usuarios.filter((u) => u.rol !== 'ADMIN')
    if (f?.rol) lista = lista.filter((u) => u.rol === f.rol)
    if (f?.estado) lista = lista.filter((u) => (f.estado === 'activos' ? u.activo : !u.activo))
    const out = lista.map((u): UsuarioAdmin => {
      const { password: _p, ...usuario } = u
      const p = db.perfiles.find((x) => x.usuarioId === u.id)
      return { usuario, nombre: p?.razonSocial ?? u.email, rutEmpresa: p?.rutEmpresa, plan: u.rol === 'PYME' ? planActual(db, u.id).plan.nombre : undefined }
    })
    const q = f?.q ? norm(f.q) : ''
    return out.filter((x) => !q || norm(`${x.nombre} ${x.usuario.email} ${x.rutEmpresa ?? ''}`).includes(q)).sort((a, b) => b.usuario.createdAt.localeCompare(a.usuario.createdAt))
  },
  async cambiarEstadoUsuario(id, activo) {
    await delay()
    const db = loadDb()
    exigir(db, 'ADMIN')
    const u = db.usuarios.find((x) => x.id === id)
    if (!u || u.rol === 'ADMIN') throw new ApiError('No se puede modificar este usuario.', 400)
    u.activo = activo
    if (!activo) Object.keys(db.sesiones).forEach((t) => { if (db.sesiones[t] === id) delete db.sesiones[t] })
    saveDb()
  },
  async eliminarUsuario(id) {
    await delay()
    const db = loadDb()
    exigir(db, 'ADMIN')
    const u = db.usuarios.find((x) => x.id === id)
    if (!u || u.rol === 'ADMIN') throw new ApiError('No se puede eliminar este usuario.', 400)
    const licIds = db.licitaciones.filter((l) => l.licitadorId === id).map((l) => l.id)
    const postIds = db.postulaciones.filter((p) => p.pymeId === id || licIds.includes(p.licitacionId)).map((p) => p.id)
    const convIds = db.conversaciones.filter((c) => postIds.includes(c.postulacionId)).map((c) => c.id)
    db.mensajes = db.mensajes.filter((m) => !convIds.includes(m.conversacionId))
    db.conversaciones = db.conversaciones.filter((c) => !convIds.includes(c.id))
    db.postulaciones = db.postulaciones.filter((p) => !postIds.includes(p.id))
    db.licitaciones = db.licitaciones.filter((l) => !licIds.includes(l.id))
    db.notificaciones = db.notificaciones.filter((n) => n.usuarioId !== id)
    db.suscripciones = db.suscripciones.filter((s) => s.usuarioId !== id)
    db.perfiles = db.perfiles.filter((p) => p.usuarioId !== id)
    db.usuarios = db.usuarios.filter((x) => x.id !== id)
    Object.keys(db.sesiones).forEach((t) => { if (db.sesiones[t] === id) delete db.sesiones[t] })
    saveDb()
  },
  async licitacionesAdmin() {
    await delay()
    const db = loadDb()
    exigir(db, 'ADMIN')
    return db.licitaciones.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((l) => aLicitacion(db, l))
  },
  async ventasAdmin() {
    await delay()
    const db = loadDb()
    exigir(db, 'ADMIN')
    return clon(db.ventas)
  },
}
