import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { api } from '../../api'
import type { Notificacion, Rol } from '../../api/types'
import { Icon, type IconName } from '../../lib/icons'
import { Link, isActive, navigate, useLocation } from '../../lib/router'
import { useAuth } from '../../context/AuthContext'
import { Avatar, Badge } from '../ui/ui'
import { Logo } from './Logo'
import { hace } from '../../lib/format'

interface Item { to: string; label: string; icon: IconName; exact?: boolean; badge?: ReactNode }

const NAV: Record<Rol, { titulo?: string; items: Item[] }[]> = {
  LICITADOR: [
    { titulo: 'Principal', items: [
      { to: '/app', label: 'Panel de control', icon: 'grid', exact: true },
      { to: '/app/licitaciones', label: 'Mis licitaciones', icon: 'file' },
      { to: '/app/licitaciones/nueva', label: 'Publicar licitación', icon: 'plus' },
    ] },
    { titulo: 'Comunicación', items: [
      { to: '/app/chat', label: 'Chat', icon: 'chat' },
      { to: '/app/notificaciones', label: 'Notificaciones', icon: 'bell' },
    ] },
    { titulo: 'Cuenta', items: [{ to: '/app/perfil', label: 'Mi perfil', icon: 'user' }] },
  ],
  PYME: [
    { titulo: 'Principal', items: [
      { to: '/app', label: 'Panel de control', icon: 'grid', exact: true },
      { to: '/app/explorar', label: 'Explorar licitaciones', icon: 'search' },
      { to: '/app/postulaciones', label: 'Mis postulaciones', icon: 'send' },
    ] },
    { titulo: 'Herramientas', items: [
      { to: '/app/asistente', label: 'LicitAsist (IA)', icon: 'sparkles' },
      { to: '/app/chat', label: 'Chat', icon: 'chat' },
      { to: '/app/notificaciones', label: 'Notificaciones', icon: 'bell' },
    ] },
    { titulo: 'Cuenta', items: [
      { to: '/app/suscripcion', label: 'Mi suscripción', icon: 'crown' },
      { to: '/app/perfil', label: 'Mi perfil', icon: 'user' },
    ] },
  ],
  ADMIN: [
    { titulo: 'Plataforma', items: [
      { to: '/app', label: 'Panel de control', icon: 'grid', exact: true },
      { to: '/app/usuarios', label: 'Usuarios', icon: 'users' },
      { to: '/app/licitaciones-admin', label: 'Licitaciones', icon: 'file' },
      { to: '/app/ventas', label: 'Ventas y suscripciones', icon: 'wallet' },
    ] },
    { titulo: 'Cuenta', items: [
      { to: '/app/notificaciones', label: 'Notificaciones', icon: 'bell' },
      { to: '/app/perfil', label: 'Mi perfil', icon: 'user' },
    ] },
  ],
}

const ROL_TXT: Record<Rol, string> = { LICITADOR: 'Licitador', PYME: 'Pyme', ADMIN: 'Administrador' }

export function useNotificaciones() {
  const [lista, setLista] = useState<Notificacion[]>([])
  const cargar = useCallback(() => { api.notificaciones().then(setLista).catch(() => undefined) }, [])
  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 15000)
    return () => clearInterval(t)
  }, [cargar])
  const marcar = useCallback(async () => { await api.marcarNotificacionesLeidas(); cargar() }, [cargar])
  return { lista, noLeidas: lista.filter((n) => !n.leida).length, marcar, recargar: cargar }
}

const ICONO_NOTIF: Record<string, IconName> = {
  'Licitación publicada': 'file', 'Postulación recibida': 'send', 'Postulación aprobada': 'checkcircle', 'Postulación rechazada': 'xcircle',
  'Licitación adjudicada': 'award', 'Pago confirmado': 'card', 'Mensaje nuevo': 'chat',
}
export const iconoNotificacion = (tipo: string): IconName => ICONO_NOTIF[tipo] ?? 'bell'

/** A qué sección lleva cada notificación al apretarla (según el tipo; el ER no guarda a qué chat o licitación se refiere). */
export function destinoNotificacion(tipo: string, rol: Rol): string | null {
  switch (tipo) {
    case 'Mensaje nuevo': return '/app/chat'
    case 'Licitación publicada':
    case 'Postulación recibida': return '/app/licitaciones'
    case 'Postulación aprobada':
    case 'Postulación rechazada':
    case 'Licitación adjudicada': return rol === 'PYME' ? '/app/postulaciones' : '/app/licitaciones'
    case 'Pago confirmado': return '/app/suscripcion'
    default: return null
  }
}

/** Fila de notificación: si tiene destino es un enlace; si no, un bloque normal. */
export function NotifItem({ n, rol, className, onIr, children }: { n: Notificacion; rol: Rol; className: string; onIr?: () => void; children: ReactNode }) {
  const destino = destinoNotificacion(n.tipo, rol)
  if (!destino) return <div className={className}>{children}</div>
  return <Link to={destino} className={`${className} notif-link`} onClick={onIr}>{children}<Icon name="chevright" size={16} className="notif-go" /></Link>
}

export function AppShell({ children }: { children: ReactNode }) {
  const { sesion, logout } = useAuth()
  const { path } = useLocation()
  const [menu, setMenu] = useState(false)
  const [campana, setCampana] = useState(false)
  const [usuario, setUsuario] = useState(false)
  const [premium, setPremium] = useState(false)
  const notif = useNotificaciones()
  const refCampana = useRef<HTMLDivElement>(null)
  const refUsuario = useRef<HTMLDivElement>(null)

  useEffect(() => { setMenu(false); setCampana(false); setUsuario(false) }, [path])
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (refCampana.current && !refCampana.current.contains(e.target as Node)) setCampana(false)
      if (refUsuario.current && !refUsuario.current.contains(e.target as Node)) setUsuario(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  useEffect(() => {
    if (sesion?.usuario.rol === 'PYME') api.miSuscripcion().then((s) => setPremium(s.plan.nombre === 'Premium')).catch(() => undefined)
  }, [sesion?.usuario.rol, path])

  if (!sesion) return null
  const { usuario: u, perfil } = sesion
  const grupos = NAV[u.rol]

  return (
    <div className="app" data-role={u.rol.toLowerCase()}>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <aside className={`sidebar ${menu ? 'open' : ''}`}>
        <div className="sb-top">
          <Link to="/app"><Logo size={34} /></Link>
          <button className="icon-btn sb-close" onClick={() => setMenu(false)} aria-label="Cerrar menú"><Icon name="x" size={20} /></button>
        </div>
        <div className="sb-user">
          <Avatar nombre={perfil.razonSocial} size={46} foto={u.foto} />
          <div>
            <b title={perfil.razonSocial}>{perfil.razonSocial}</b>
            <span>{ROL_TXT[u.rol]}{u.rol === 'PYME' && premium ? ' · Premium' : ''}</span>
          </div>
          {perfil.siiValidado && u.rol !== 'ADMIN' && <span className="sb-verif" title="Empresa verificada en el SII"><Icon name="shieldcheck" size={18} /></span>}
        </div>
        <nav className="sb-nav">
          {grupos.map((g) => (
            <div key={g.titulo} className="sb-group">
              {g.titulo && <small>{g.titulo}</small>}
              {g.items.map((i) => {
                // la ruta más específica gana (ej. /app/licitaciones/nueva vs /app/licitaciones)
                const hermanos = grupos.flatMap((x) => x.items).filter((x) => x.to !== i.to && x.to.startsWith(i.to + '/'))
                const activo = isActive(path, i.to, i.exact) && !hermanos.some((h) => isActive(path, h.to))
                const detalle = i.to === '/app/licitaciones' && path.startsWith('/app/licitacion/')
                return (
                  <Link key={i.to} to={i.to} className={`sb-link ${activo || detalle ? 'on' : ''}`}>
                    <Icon name={i.icon} size={19} />
                    <span>{i.label}</span>
                    {i.to === '/app/notificaciones' && notif.noLeidas > 0 && <em>{notif.noLeidas}</em>}
                    {i.to === '/app/asistente' && !premium && <Icon name="lock" size={14} className="sb-lock" />}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>
        {u.rol === 'LICITADOR' && (
          <div className="sb-promo promo-lic">
            <Icon name="gift" size={20} />
            <b>TODO ES GRATIS</b>
            <span>Publica, recibe postulaciones y adjudica sin pagar.</span>
          </div>
        )}
        {u.rol === 'PYME' && !premium && (
          <Link to="/app/suscripcion" className="sb-promo promo-pyme">
            <Icon name="crown" size={20} />
            <b>Pásate a Premium</b>
            <span>7 postulaciones al mes, IA y más visibilidad.</span>
          </Link>
        )}
        <button className="sb-logout" onClick={async () => { await logout(); navigate('/', true) }}><Icon name="logout" size={19} /><span>Cerrar sesión</span></button>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn burger" onClick={() => setMenu(true)} aria-label="Abrir menú"><Icon name="menu" size={22} /></button>
          <div className="top-title">
            <span>Hola,</span> <b>{perfil.nombreContacto.split(' ')[0]}</b>
          </div>
          <div className="top-right">
            {u.rol === 'PYME' && (premium
              ? <Badge tono="teal" icon="crown">Premium</Badge>
              : <Link to="/app/suscripcion" className="btn btn-soft btn-sm"><Icon name="crown" size={16} /><span>Mejorar plan</span></Link>)}
            {u.rol === 'ADMIN' && <Badge tono="violet" icon="shield">Administrador</Badge>}
            <div className="menu-wrap" ref={refCampana}>
              <button className="icon-btn bell" onClick={() => { setCampana((v) => !v); setUsuario(false) }} aria-label="Notificaciones">
                <Icon name="bell" size={21} />
                {notif.noLeidas > 0 && <i>{notif.noLeidas > 9 ? '9+' : notif.noLeidas}</i>}
              </button>
              {campana && (
                <div className="dropdown notif-dd">
                  <div className="dd-head"><b>Notificaciones</b><button className="link-btn" onClick={notif.marcar}>Marcar leídas</button></div>
                  {notif.lista.length === 0 ? <p className="dd-empty">Sin notificaciones</p> : notif.lista.slice(0, 5).map((n) => (
                    <NotifItem key={n.id} n={n} rol={u.rol} className={`notif-item ${n.leida ? '' : 'unread'}`} onIr={() => setCampana(false)}>
                      <span className="notif-ic"><Icon name={iconoNotificacion(n.tipo)} size={16} /></span>
                      <div><b>{n.titulo}</b><p>{n.detalle}</p><small>{hace(n.createdAt)}</small></div>
                    </NotifItem>
                  ))}
                  <Link to="/app/notificaciones" className="dd-foot">Ver todas las notificaciones</Link>
                </div>
              )}
            </div>
            <div className="menu-wrap" ref={refUsuario}>
              <button className="user-btn" onClick={() => { setUsuario((v) => !v); setCampana(false) }}>
                <Avatar nombre={perfil.nombreContacto} size={34} foto={u.foto} />
                <span className="user-btn-name">{ROL_TXT[u.rol]}</span>
                <Icon name="chevdown" size={16} />
              </button>
              {usuario && (
                <div className="dropdown user-dd">
                  <div className="dd-user"><b>{perfil.nombreContacto}</b><small>{u.email}</small></div>
                  <Link to="/app/perfil" className="dd-item"><Icon name="user" size={17} />Mi perfil</Link>
                  {u.rol === 'PYME' && <Link to="/app/suscripcion" className="dd-item"><Icon name="crown" size={17} />Mi suscripción</Link>}
                  {u.rol !== 'ADMIN' && <Link to="/app/ayuda" className="dd-item"><Icon name="help" size={17} />Ayuda</Link>}
                  <button className="dd-item danger" onClick={async () => { await logout(); navigate('/', true) }}><Icon name="logout" size={17} />Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  )
}
