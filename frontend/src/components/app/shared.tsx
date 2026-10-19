import { useEffect, useState, type ReactNode } from 'react'
import type { Licitacion } from '../../api/types'
import { Icon, type IconName } from '../../lib/icons'
import { Link } from '../../lib/router'
import { Badge, tonoEstado } from '../ui/ui'
import { useCatalogos } from '../../context/AuthContext'
import { diasHasta, hace, rangoPresupuesto } from '../../lib/format'
import { NotifItem, iconoNotificacion, useNotificaciones } from '../layout/AppShell'
import { useAuth } from '../../context/AuthContext'

/* ---------- Carrusel superior ---------- */
export interface Slide { chip: string; icon: IconName; titulo: string; texto: string; tono: 'blue' | 'teal' | 'violet' | 'green'; to?: string; cta?: string }

export function BannerCarousel({ slides }: { slides: Slide[] }) {
  const [i, setI] = useState(0)
  const [pausa, setPausa] = useState(false)
  useEffect(() => {
    if (pausa) return
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [pausa, slides.length])
  const s = slides[i]
  return (
    <section className={`banner banner-${s.tono}`} onMouseEnter={() => setPausa(true)} onMouseLeave={() => setPausa(false)}>
      <div className="banner-orbs"><i /><i /></div>
      <div className="banner-body" key={i}>
        <span className="banner-chip"><Icon name={s.icon} size={14} />{s.chip}</span>
        <h2>{s.titulo}</h2>
        <p>{s.texto}</p>
        {s.to && <Link to={s.to} className="banner-cta">{s.cta ?? 'Ver más'} <Icon name="arrowright" size={16} /></Link>}
      </div>
      <div className="banner-art"><Icon name={s.icon} size={96} /></div>
      <div className="banner-ctrl">
        <button onClick={() => setI((i - 1 + slides.length) % slides.length)} aria-label="Anterior"><Icon name="chevleft" size={16} /></button>
        <div className="banner-dots">{slides.map((_, k) => <i key={k} className={k === i ? 'on' : ''} onClick={() => setI(k)} />)}</div>
        <button onClick={() => setI((i + 1) % slides.length)} aria-label="Siguiente"><Icon name="chevright" size={16} /></button>
        <small>{i + 1}/{slides.length}</small>
      </div>
    </section>
  )
}

/* ---------- Tarjeta de licitación ---------- */
export function TenderCard({ l, acciones }: { l: Licitacion; acciones?: ReactNode }) {
  const cat = useCatalogos()
  const dias = diasHasta(l.fechaCierre)
  const urgente = l.estado === 'Abierta' && dias <= 5 && dias >= 0
  return (
    <article className="tcard">
      <Link to={`/app/licitacion/${l.id}`} className="tcard-main">
        <div className="tcard-top">
          <Badge tono={tonoEstado(l.estado)} dot>{l.estado}</Badge>
          <span className="tcard-rubro">{cat.rubro(l.rubroId)}</span>
        </div>
        <h4>{l.titulo}</h4>
        <p className="tcard-emp"><Icon name="building" size={14} />{l.licitadorNombre}</p>
        <div className="tcard-meta">
          <span><Icon name="pin" size={14} />{cat.region(l.regionId)}</span>
          <span><Icon name="dollar" size={14} />{rangoPresupuesto(l.presupuestoMin, l.presupuestoMax)}</span>
        </div>
        <div className="tcard-foot">
          <span className={urgente ? 'urg' : ''}><Icon name="clock" size={14} />{l.estado !== 'Abierta' ? 'Finalizada' : dias < 0 ? 'Vencida' : dias === 0 ? 'Cierra hoy' : `Cierra en ${dias} día${dias === 1 ? '' : 's'}`}</span>
          <span><Icon name="users" size={14} />{l.postulantes} postulante{l.postulantes === 1 ? '' : 's'}</span>
        </div>
      </Link>
      {acciones && <div className="tcard-actions">{acciones}</div>}
    </article>
  )
}

/* ---------- Panel de notificaciones (columna derecha) ---------- */
export function NotifPanel({ limite = 4 }: { limite?: number }) {
  const { lista, marcar } = useNotificaciones()
  const rol = useAuth().sesion!.usuario.rol
  return (
    <div className="card card-pad notif-panel">
      <div className="card-header">
        <div className="card-title-wrap"><span className="card-title-icon"><Icon name="bell" size={18} /></span><h3 className="card-title">Notificaciones</h3></div>
        <Link to="/app/notificaciones" className="link">Ver todas</Link>
      </div>
      {lista.length === 0 ? <p className="muted-p">Todo al día. No tienes notificaciones.</p> : lista.slice(0, limite).map((n) => (
        <NotifItem key={n.id} n={n} rol={rol} className={`notif-item ${n.leida ? '' : 'unread'}`}>
          <span className="notif-ic"><Icon name={iconoNotificacion(n.tipo)} size={16} /></span>
          <div><b>{n.titulo}</b><p>{n.detalle}</p><small>{hace(n.createdAt)}</small></div>
        </NotifItem>
      ))}
      {lista.some((n) => !n.leida) && <button className="btn btn-soft btn-sm btn-block" onClick={marcar}>Marcar todas como leídas</button>}
    </div>
  )
}

/* ---------- Filtros de búsqueda ---------- */
export function VolverLink({ to, texto }: { to: string; texto: string }) {
  return <Link to={to} className="back"><Icon name="arrowleft" size={16} /> {texto}</Link>
}
