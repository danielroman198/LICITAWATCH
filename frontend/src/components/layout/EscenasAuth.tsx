import { useEffect, useMemo, useState } from 'react'
import { Icon, type IconName } from '../../lib/icons'
import { LogoMark } from './Logo'

/* ============================================================
   Login: licitaciones llegando en vivo + notificaciones → logo
   ============================================================ */

type Lic = { titulo: string; empresa: string; region: string; monto: string; rubro: string; icon: IconName }

const LICITACIONES: Lic[] = [
  { titulo: 'Construcción de bodega logística', empresa: 'Constructora Andes', region: 'Metropolitana', monto: '$45M – $68M', rubro: 'Construcción', icon: 'building' },
  { titulo: 'Desarrollo de portal web y app', empresa: 'Retail Pacífico', region: 'Valparaíso', monto: '$12M – $20M', rubro: 'Tecnología', icon: 'globe' },
  { titulo: 'Transporte refrigerado Stgo–Antofagasta', empresa: 'Logística Austral', region: 'Antofagasta', monto: '$3,5M – $5,2M', rubro: 'Transporte', icon: 'rocket' },
  { titulo: 'Instalación de paneles solares', empresa: 'Energía Solar del Sur', region: 'Atacama', monto: '$120M – $180M', rubro: 'Energía', icon: 'zap' },
  { titulo: 'Servicio de seguridad para faenas', empresa: 'Minera Cordillera', region: 'Tarapacá', monto: '$9M – $14M', rubro: 'Seguridad', icon: 'shield' },
  { titulo: 'Auditoría de ciberseguridad', empresa: 'Clínica Santa Elena', region: 'Biobío', monto: '$8M – $13M', rubro: 'Tecnología', icon: 'lock' },
  { titulo: 'Campaña de marketing digital', empresa: 'Retail Pacífico', region: 'Los Lagos', monto: '$5,5M – $9M', rubro: 'Marketing', icon: 'trending' },
  { titulo: 'Mantención de áreas verdes', empresa: 'Inmobiliaria Austral', region: 'Araucanía', monto: '$4M – $6M', rubro: 'Servicios', icon: 'sparkles' },
]

const AVISOS = [
  { icon: 'bell' as IconName, titulo: 'Nueva licitación en tu rubro', texto: 'Construcción · Región Metropolitana' },
  { icon: 'checkcircle' as IconName, titulo: 'Postulación aprobada', texto: 'Soluciones TI Maipo SpA' },
  { icon: 'award' as IconName, titulo: '¡Licitación adjudicada!', texto: 'Se abrió el chat con el licitador' },
]

const POR_CICLO = 6 // tarjetas que llegan antes de mostrar el logo
const PASO_MS = 1700
const LOGO_MS = 4200
const VISIBLES = 4

export function LoginEnVivo() {
  const [fase, setFase] = useState<'feed' | 'logo'>('feed')
  const [n, setN] = useState(0) // tarjetas llegadas en este ciclo
  const [ciclo, setCiclo] = useState(0)
  const [hoy, setHoy] = useState(126)

  useEffect(() => {
    if (fase === 'logo') {
      const t = setTimeout(() => { setN(0); setCiclo((c) => c + 1); setFase('feed') }, LOGO_MS)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => {
      if (n >= POR_CICLO) { setFase('logo'); return }
      setN((x) => x + 1)
      setHoy((h) => h + 1)
    }, n === 0 ? 500 : PASO_MS)
    return () => clearTimeout(t)
  }, [fase, n])

  // Últimas tarjetas, la más nueva primero. La clave es única por ciclo para que React anime la entrada.
  const tarjetas = []
  for (let i = n - 1; i >= Math.max(0, n - VISIBLES - 1); i--) {
    const idx = (ciclo * POR_CICLO + i) % LICITACIONES.length
    tarjetas.push({ key: `${ciclo}-${i}`, pos: n - 1 - i, lic: LICITACIONES[idx] })
  }
  const aviso = n === 2 ? AVISOS[ciclo % AVISOS.length] : n === 5 ? AVISOS[(ciclo + 1) % AVISOS.length] : null

  return (
    <div className={`ev-scene ${fase === 'logo' ? 'is-logo' : ''}`}>
      <div className="ev-grid" aria-hidden="true" />
      <div className="ev-orb ev-orb-a" /><div className="ev-orb ev-orb-b" />

      <div className="ev-live">
        <span className="ev-dot" /> EN VIVO
        <span className="ev-count">Licitaciones publicadas hoy: <b>{hoy}</b></span>
      </div>

      <div className="ev-feed" aria-hidden="true">
        {tarjetas.map(({ key, pos, lic }) => (
          <article key={key} className="ev-card" style={{ transform: `translateY(${pos * 112}px) scale(${1 - pos * 0.04})`, opacity: pos >= VISIBLES ? 0 : 1 - pos * 0.24, zIndex: 10 - pos }}>
            <span className="ev-ic"><Icon name={lic.icon} size={20} /></span>
            <div className="ev-body">
              <div className="ev-head"><span className="ev-new">Nueva</span><small>{lic.rubro}</small><b className="ev-money">{lic.monto}</b></div>
              <b className="ev-title">{lic.titulo}</b>
              <small className="ev-meta"><Icon name="building" size={12} /> {lic.empresa} · <Icon name="pin" size={12} /> {lic.region}</small>
            </div>
          </article>
        ))}
      </div>

      {aviso && fase === 'feed' && (
        <div className="ev-toast" key={`${ciclo}-${n}`}>
          <span className="ev-toast-ic"><Icon name={aviso.icon} size={18} /></span>
          <div><b>{aviso.titulo}</b><small>{aviso.texto}</small></div>
        </div>
      )}

      {fase === 'logo' && (
        <div className="ev-reveal" key={`logo-${ciclo}`}>
          <div className="ev-mark">
            <i className="ev-ring" /><i className="ev-ring r2" />
            <LogoMark size={112} />
          </div>
          <div className="ev-brand">Licita<b>Watch</b></div>
          <p>Todas tus licitaciones, en la palma de tu mano.</p>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Registro: mapa de Chile con regiones que se iluminan
   ============================================================ */

// Regiones de norte a sur con su latitud aproximada (grados sur).
const REGIONES = [
  { nombre: 'Arica y Parinacota', desde: 17.5, hasta: 19.2 },
  { nombre: 'Tarapacá', desde: 19.2, hasta: 21.6 },
  { nombre: 'Antofagasta', desde: 21.6, hasta: 26.1 },
  { nombre: 'Atacama', desde: 26.1, hasta: 29.2 },
  { nombre: 'Coquimbo', desde: 29.2, hasta: 32.2 },
  { nombre: 'Valparaíso', desde: 32.2, hasta: 33.1 },
  { nombre: 'Metropolitana', desde: 33.1, hasta: 34.0 },
  { nombre: "O'Higgins", desde: 34.0, hasta: 35.0 },
  { nombre: 'Maule', desde: 35.0, hasta: 36.3 },
  { nombre: 'Ñuble', desde: 36.3, hasta: 37.1 },
  { nombre: 'Biobío', desde: 37.1, hasta: 38.4 },
  { nombre: 'La Araucanía', desde: 38.4, hasta: 39.6 },
  { nombre: 'Los Ríos', desde: 39.6, hasta: 40.6 },
  { nombre: 'Los Lagos', desde: 40.6, hasta: 44.0 },
  { nombre: 'Aysén', desde: 44.0, hasta: 49.0 },
  { nombre: 'Magallanes', desde: 49.0, hasta: 55.9 },
]

// Contorno simplificado: [latitud, longitud costa, longitud frontera este] (grados oeste).
const CONTORNO: [number, number, number][] = [
  [17.5, 70.4, 69.4], [19.5, 70.2, 68.7], [21.5, 70.2, 68.2], [23.5, 70.5, 67.2], [25.5, 70.6, 68.4],
  [27.5, 71.0, 68.9], [30, 71.6, 69.9], [33, 71.7, 70.0], [35, 72.3, 70.4], [37, 73.3, 71.1],
  [39, 73.4, 71.5], [41.5, 73.9, 71.9], [44, 74.8, 71.7], [46.5, 75.6, 71.8], [49, 75.6, 72.6],
  [51.5, 75.3, 72.0], [52.6, 74.6, 68.5], [54.2, 72.6, 68.6], [55.9, 69.0, 67.3],
]

const LAT0 = 17.5
const LON_MAX = 76
const ESC_Y = 9.2 // px por grado de latitud
const ESC_X = 12 // px por grado de longitud (algo exagerado para que se lea)

function bordes(lat: number): [number, number] {
  for (let i = 1; i < CONTORNO.length; i++) {
    const [l1, c1, e1] = CONTORNO[i - 1]
    const [l2, c2, e2] = CONTORNO[i]
    if (lat <= l2) {
      const t = (lat - l1) / (l2 - l1)
      return [c1 + (c2 - c1) * t, e1 + (e2 - e1) * t]
    }
  }
  const u = CONTORNO[CONTORNO.length - 1]
  return [u[1], u[2]]
}

const px = (lon: number) => (LON_MAX - lon) * ESC_X
const py = (lat: number) => (lat - LAT0) * ESC_Y

function poligono(desde: number, hasta: number) {
  const lats = [desde, ...CONTORNO.map((c) => c[0]).filter((l) => l > desde && l < hasta), hasta]
  const izq = lats.map((l) => `${px(bordes(l)[0]).toFixed(1)},${py(l).toFixed(1)}`)
  const der = lats.slice().reverse().map((l) => `${px(bordes(l)[1]).toFixed(1)},${py(l).toFixed(1)}`)
  return [...izq, ...der].join(' ')
}

const EVENTOS = [
  { titulo: 'Construcción de puente peatonal', monto: '$80M', icon: 'building' as IconName },
  { titulo: 'Soporte TI para municipio', monto: '$15M', icon: 'globe' as IconName },
  { titulo: 'Transporte de insumos médicos', monto: '$6M', icon: 'rocket' as IconName },
  { titulo: 'Paneles solares en escuelas', monto: '$140M', icon: 'zap' as IconName },
  { titulo: 'Guardias para centro logístico', monto: '$11M', icon: 'shield' as IconName },
  { titulo: 'Catering para faena minera', monto: '$22M', icon: 'briefcase' as IconName },
  { titulo: 'Campaña de turismo regional', monto: '$9M', icon: 'trending' as IconName },
]

type Evento = { id: number; region: number; ev: (typeof EVENTOS)[number] }

export function MapaChileVivo() {
  const formas = useMemo(() => REGIONES.map((r) => {
    const [c, e] = bordes((r.desde + r.hasta) / 2)
    return { ...r, puntos: poligono(r.desde, r.hasta), cx: (px(c) + px(e)) / 2, cy: py((r.desde + r.hasta) / 2) }
  }), [])
  const ancho = Math.ceil(px(67))
  const alto = Math.ceil(py(55.9))

  const [eventos, setEventos] = useState<Evento[]>([])
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let id = 0
    let previa = -1
    const lanzar = () => {
      let region = Math.floor(Math.random() * REGIONES.length)
      if (region === previa) region = (region + 5) % REGIONES.length
      previa = region
      const ev = EVENTOS[id % EVENTOS.length]
      setEventos((xs) => [{ id: id++, region, ev }, ...xs].slice(0, 4))
      setTotal((t) => t + 1)
    }
    lanzar()
    const t = setInterval(lanzar, 1600)
    return () => clearInterval(t)
  }, [])

  const activa = eventos[0]?.region

  return (
    <div className="mapa-vivo">
      <svg className="mapa-svg" viewBox={`-14 -14 ${ancho + 28} ${alto + 28}`} role="img" aria-label="Mapa de Chile con licitaciones publicándose en cada región">
        <defs>
          <linearGradient id="mapa-g" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity=".34" />
            <stop offset="1" stopColor="#ffffff" stopOpacity=".18" />
          </linearGradient>
        </defs>
        {formas.map((f, i) => (
          <polygon key={f.nombre} points={f.puntos} className={`mapa-reg ${i === activa ? 'on' : ''} ${eventos.some((e) => e.region === i) ? 'reciente' : ''}`} />
        ))}
        {eventos.map((e) => (
          <g key={e.id} className="mapa-ping" style={{ transform: `translate(${formas[e.region].cx}px, ${formas[e.region].cy}px)` }}>
            <circle r="4" className="mapa-ping-dot" />
            <circle r="4" className="mapa-ping-wave" />
          </g>
        ))}
      </svg>

      <div className="mapa-feed">
        <div className="mapa-feed-head"><span className="ev-dot" /> Publicándose ahora <b>+{total}</b></div>
        {eventos.map((e, i) => (
          <div key={e.id} className={`mapa-item ${i === 0 ? 'nuevo' : ''}`}>
            <span className="mapa-item-ic"><Icon name={e.ev.icon} size={16} /></span>
            <div>
              <b>{e.ev.titulo}</b>
              <small><Icon name="pin" size={11} /> {REGIONES[e.region].nombre} · {e.ev.monto}</small>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
