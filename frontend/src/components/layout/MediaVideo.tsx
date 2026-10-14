import { useState, type ReactNode } from 'react'

/** Video (hecho con IA) con respaldo animado si el archivo no existe. */
export function MediaVideo({ src, poster, fallback, className = '' }: { src: string; poster?: string; fallback: ReactNode; className?: string }) {
  const [falla, setFalla] = useState(false)
  if (falla) return <>{fallback}</>
  return (
    <video
      className={className}
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      onError={() => setFalla(true)}
    >
      <source src={src} type="video/mp4" onError={() => setFalla(true)} />
    </video>
  )
}

/** Tablet con la app LicitaWatch haciendo scroll (animación de respaldo para el video del login). */
export function TabletDemo() {
  const filas = [
    ['Construcción de bodega logística', 'Constructora Andes', '$45M – $68M', 'green'],
    ['Desarrollo de portal web y app', 'Retail Pacífico', '$12M – $20M', 'green'],
    ['Transporte refrigerado Stgo–Antofagasta', 'Logística Austral', '$3,5M – $5,2M', 'green'],
    ['Instalación de paneles solares', 'Energía Solar del Sur', '$120M – $180M', 'violet'],
    ['Servicio de seguridad para faenas', 'Minera Cordillera', '$9M – $14M', 'green'],
    ['Auditoría de ciberseguridad', 'Clínica Santa Elena', '$8M – $13M', 'green'],
    ['Campaña de marketing digital', 'Retail Pacífico', '$5,5M – $9M', 'green'],
  ]
  return (
    <div className="tablet-scene">
      <div className="tablet">
        <div className="tablet-cam" />
        <div className="tablet-screen">
          <div className="tablet-top">
            <span className="tablet-logo" />
            <span className="tablet-pill" />
            <span className="tablet-dot" />
          </div>
          <div className="tablet-scroll">
            {[...filas, ...filas].map((f, i) => (
              <div className="tablet-card" key={i}>
                <div className="tablet-card-head">
                  <span className={`tablet-badge ${f[3]}`}>{f[3] === 'violet' ? 'Adjudicada' : 'Abierta'}</span>
                  <span className="tablet-money">{f[2]}</span>
                </div>
                <b>{f[0]}</b>
                <span>{f[1]}</span>
                <div className="tablet-bar"><i style={{ width: `${40 + ((i * 17) % 55)}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="tablet-glow" />
    </div>
  )
}

/** Respaldo del video del Home: panel de la plataforma con tarjetas flotantes. */
export function HeroFallback() {
  return (
    <div className="hero-fallback">
      <div className="hf-window">
        <div className="hf-bar"><i /><i /><i /><span>app.licitawatch.cl</span></div>
        <div className="hf-body">
          <div className="hf-side"><i className="on" /><i /><i /><i /><i /></div>
          <div className="hf-main">
            <div className="hf-kpis">
              <div><span>Licitaciones abiertas</span><b>24</b></div>
              <div><span>Postulaciones</span><b>118</b></div>
              <div><span>Adjudicadas</span><b>9</b></div>
            </div>
            <div className="hf-chart">
              {[38, 55, 42, 70, 62, 88, 76].map((h, i) => <i key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }} />)}
            </div>
            <div className="hf-rows"><i /><i /><i /></div>
          </div>
        </div>
      </div>
      <div className="hf-float hf-a"><span className="hf-ic">✓</span><div><b>Postulación aprobada</b><small>Soluciones TI Maipo SpA</small></div></div>
      <div className="hf-float hf-b"><span className="hf-ic teal">★</span><div><b>Licitación adjudicada</b><small>Chat abierto con la Pyme</small></div></div>
      <div className="hf-float hf-c"><span className="hf-ic violet">✦</span><div><b>LicitAsist</b><small>3 licitaciones para tu rubro</small></div></div>
    </div>
  )
}
