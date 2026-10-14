import { useState } from 'react'
import type { PuntoMensual } from '../api/types'

// Gráficos SVG livianos (sin librerías).

const nice = (n: number) => {
  if (n <= 5) return 5
  const p = Math.pow(10, Math.floor(Math.log10(n)))
  const f = n / p
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return m * p
}

interface SerieProps {
  datos: PuntoMensual[]
  formato?: (n: number) => string
  color?: string
  alto?: number
}

export function BarChart({ datos, formato = (n) => String(n), color = 'var(--accent)', alto = 220 }: SerieProps) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 560
  const H = alto
  const pad = { l: 40, r: 10, t: 14, b: 28 }
  const max = nice(Math.max(1, ...datos.map((d) => d.valor)))
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const bw = Math.min(46, (iw / datos.length) * 0.56)
  const ticks = [0, 0.25, 0.5, 0.75, 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Gráfico de barras">
      {ticks.map((t) => {
        const y = pad.t + ih - ih * t
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" className="chart-tick">
              {formato(Math.round(max * t))}
            </text>
          </g>
        )
      })}
      {datos.map((d, i) => {
        const step = iw / datos.length
        const x = pad.l + step * i + (step - bw) / 2
        const h = (d.valor / max) * ih
        const y = pad.t + ih - h
        return (
          <g key={d.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <rect x={pad.l + step * i} y={pad.t} width={step} height={ih} fill="transparent" />
            <rect x={x} y={y} width={bw} height={Math.max(h, 2)} rx={8} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="chart-tick">
              {d.mes}
            </text>
            {hover === i && (
              <g>
                <rect x={x + bw / 2 - 34} y={y - 30} width={68} height={22} rx={8} fill="var(--text)" />
                <text x={x + bw / 2} y={y - 15} textAnchor="middle" fill="#fff" fontSize="11" fontWeight={700}>
                  {formato(d.valor)}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function AreaChart({ datos, formato = (n) => String(n), color = 'var(--accent)', alto = 220 }: SerieProps) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 560
  const H = alto
  const pad = { l: 44, r: 14, t: 16, b: 28 }
  const max = nice(Math.max(1, ...datos.map((d) => d.valor)))
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const pts = datos.map((d, i) => ({
    x: pad.l + (datos.length === 1 ? iw / 2 : (iw * i) / (datos.length - 1)),
    y: pad.t + ih - (d.valor / max) * ih,
    d,
  }))
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${line} L${pts[pts.length - 1].x},${pad.t + ih} L${pts[0].x},${pad.t + ih} Z`
  const id = `grad-${color.replace(/[^a-z0-9]/gi, '')}`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Gráfico de línea">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad.t + ih - ih * t
        return (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="var(--border)" strokeDasharray="3 4" />
            <text x={pad.l - 8} y={y + 4} textAnchor="end" className="chart-tick">
              {formato(Math.round(max * t))}
            </text>
          </g>
        )
      })}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <g key={p.d.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
          <rect x={p.x - 24} y={pad.t} width={48} height={ih} fill="transparent" />
          <circle cx={p.x} cy={p.y} r={hover === i ? 6 : 4} fill="#fff" stroke={color} strokeWidth={3} />
          <text x={p.x} y={H - 8} textAnchor="middle" className="chart-tick">
            {p.d.mes}
          </text>
          {hover === i && (
            <g>
              <rect x={p.x - 38} y={p.y - 34} width={76} height={22} rx={8} fill="var(--text)" />
              <text x={p.x} y={p.y - 19} textAnchor="middle" fill="#fff" fontSize="11" fontWeight={700}>
                {formato(p.d.valor)}
              </text>
            </g>
          )}
        </g>
      ))}
    </svg>
  )
}

export interface Segmento {
  etiqueta: string
  valor: number
  color: string
}

export function Donut({ segmentos, centro, subtitulo }: { segmentos: Segmento[]; centro: string; subtitulo?: string }) {
  const total = segmentos.reduce((s, x) => s + x.valor, 0) || 1
  const R = 52
  const C = 2 * Math.PI * R
  let acc = 0
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label="Gráfico circular">
        <circle cx="70" cy="70" r={R} fill="none" stroke="var(--surface-2)" strokeWidth="16" />
        {segmentos.map((s) => {
          const len = (s.valor / total) * C
          const el = (
            <circle
              key={s.etiqueta}
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke={s.color}
              strokeWidth="16"
              strokeDasharray={`${Math.max(len - 2, 0)} ${C}`}
              strokeDashoffset={-acc}
              transform="rotate(-90 70 70)"
              strokeLinecap="butt"
            />
          )
          acc += len
          return el
        })}
        <text x="70" y="68" textAnchor="middle" fontSize="22" fontWeight={800} fill="var(--text)">
          {centro}
        </text>
        {subtitulo && (
          <text x="70" y="86" textAnchor="middle" fontSize="9.500" fill="var(--muted)">
            {subtitulo}
          </text>
        )}
      </svg>
      <ul className="donut-legend">
        {segmentos.map((s) => (
          <li key={s.etiqueta}>
            <span className="dot" style={{ background: s.color }} />
            <span>{s.etiqueta}</span>
            <b>{s.valor}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function HBars({ items, color = 'var(--accent)' }: { items: { etiqueta: string; valor: number }[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.valor))
  return (
    <ul className="hbars">
      {items.map((i) => (
        <li key={i.etiqueta}>
          <div className="hbars-top">
            <span>{i.etiqueta}</span>
            <b>{i.valor}</b>
          </div>
          <div className="hbars-track">
            <div className="hbars-fill" style={{ width: `${(i.valor / max) * 100}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Sparkline({ valores, color = 'var(--accent)' }: { valores: number[]; color?: string }) {
  const W = 90
  const H = 30
  const max = Math.max(1, ...valores)
  const min = Math.min(...valores)
  const rango = Math.max(1, max - min)
  const pts = valores.map((v, i) => `${(W * i) / Math.max(1, valores.length - 1)},${H - 3 - ((v - min) / rango) * (H - 6)}`)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth={2.200} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
