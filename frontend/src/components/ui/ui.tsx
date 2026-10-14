import {
  createContext, useCallback, useContext, useEffect, useId, useRef, useState,
  type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes,
} from 'react'
import { Icon, type IconName } from '../../lib/icons'
import { iniciales } from '../../lib/format'

/* ---------------- Botón ---------------- */
type Variante = 'primary' | 'soft' | 'ghost' | 'outline' | 'danger' | 'success' | 'teal'
interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variante
  size?: 'sm' | 'md' | 'lg'
  icon?: IconName
  iconRight?: IconName
  loading?: boolean
  block?: boolean
}
export function Button({ variant = 'primary', size = 'md', icon, iconRight, loading, block, children, className = '', disabled, ...rest }: BtnProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="spinner" /> : icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} /> : null}
      {children && <span>{children}</span>}
      {iconRight && !loading && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} />}
    </button>
  )
}

/* ---------------- Campos ---------------- */
interface FieldProps {
  label?: string
  required?: boolean
  hint?: string
  error?: string | null
  ok?: string | null
  children: ReactNode
  className?: string
}
export function Field({ label, required, hint, error, ok, children, className = '' }: FieldProps) {
  return (
    <label className={`field ${error ? 'has-error' : ''} ${className}`}>
      {label && (
        <span className="field-label">
          {label}
          {required && <i>*</i>}
        </span>
      )}
      {children}
      {error ? <span className="field-msg err"><Icon name="alert" size={14} />{error}</span>
        : ok ? <span className="field-msg ok"><Icon name="checkcircle" size={14} />{ok}</span>
        : hint ? <span className="field-msg">{hint}</span> : null}
    </label>
  )
}
export function Input({ icon, right, className = '', ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: IconName; right?: ReactNode }) {
  return (
    <span className={`input-wrap ${icon ? 'with-icon' : ''} ${className}`}>
      {icon && <Icon name={icon} size={18} className="input-icon" />}
      <input className="input" {...rest} />
      {right && <span className="input-right">{right}</span>}
    </span>
  )
}
export function Select({ children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="input-wrap select-wrap">
      <select className="input" {...rest}>{children}</select>
      <Icon name="chevdown" size={16} className="select-caret" />
    </span>
  )
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input textarea" {...props} />
}

/* ---------------- Contenedores ---------------- */
export function Card({ children, className = '', pad = true, ...rest }: { children: ReactNode; className?: string; pad?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`card ${pad ? 'card-pad' : ''} ${className}`} {...rest}>{children}</div>
}
export function CardHeader({ title, subtitle, action, icon }: { title: string; subtitle?: string; action?: ReactNode; icon?: IconName }) {
  return (
    <div className="card-header">
      <div className="card-title-wrap">
        {icon && <span className="card-title-icon"><Icon name={icon} size={18} /></span>}
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="card-sub">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
export function PageHeader({ title, subtitle, actions, back }: { title: string; subtitle?: string; actions?: ReactNode; back?: ReactNode }) {
  return (
    <div className="page-header">
      <div>
        {back}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  )
}

/* ---------------- Badges ---------------- */
export type Tono = 'blue' | 'teal' | 'violet' | 'green' | 'amber' | 'red' | 'gray'
export function Badge({ tono = 'gray', children, icon, dot }: { tono?: Tono; children: ReactNode; icon?: IconName; dot?: boolean }) {
  return (
    <span className={`badge badge-${tono}`}>
      {dot && <span className="badge-dot" />}
      {icon && <Icon name={icon} size={13} />}
      {children}
    </span>
  )
}
export const tonoEstado = (e: string): Tono =>
  ({ Abierta: 'green', Cerrada: 'gray', Adjudicada: 'violet', Pendiente: 'amber', Aprobada: 'green', Rechazada: 'red', Activa: 'green', Vencida: 'gray', Cancelada: 'red', Aprobado: 'green', Rechazado: 'red' } as Record<string, Tono>)[e] ?? 'gray'

/* ---------------- Avatar ---------------- */
export function Avatar({ nombre, size = 40, tono }: { nombre: string; size?: number; tono?: string }) {
  let h = 0
  for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) % 360
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: tono ?? `hsl(${h} 70% 94%)`, color: `hsl(${h} 55% 32%)` }}>
      {iniciales(nombre)}
    </span>
  )
}

/* ---------------- Otros ---------------- */
export function Spinner({ grande }: { grande?: boolean }) {
  return <span className={`spinner ${grande ? 'spinner-lg' : ''}`} />
}
export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <div className="loading"><Spinner grande /><span>{texto}</span></div>
}
export function EmptyState({ icon = 'inbox', titulo, texto, accion }: { icon?: IconName; titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon"><Icon name={icon} size={28} /></span>
      <h4>{titulo}</h4>
      {texto && <p>{texto}</p>}
      {accion}
    </div>
  )
}
export function Progress({ valor, max, tono = 'accent' }: { valor: number; max: number; tono?: 'accent' | 'amber' | 'red' }) {
  const pct = Math.min(100, (valor / Math.max(1, max)) * 100)
  return <div className="progress"><div className={`progress-fill ${tono}`} style={{ width: `${pct}%` }} /></div>
}
export function StatCard({ icon, label, valor, delta, tono = 'accent', extra }: { icon: IconName; label: string; valor: ReactNode; delta?: string; tono?: 'accent' | 'green' | 'amber' | 'violet' | 'red'; extra?: ReactNode }) {
  return (
    <div className="stat">
      <span className={`stat-icon tone-${tono}`}><Icon name={icon} size={20} /></span>
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <b className="stat-value">{valor}</b>
        {delta && <span className="stat-delta">{delta}</span>}
      </div>
      {extra}
    </div>
  )
}
export function Tabs<T extends string>({ valor, onChange, items }: { valor: T; onChange: (v: T) => void; items: { id: T; label: string; count?: number }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((i) => (
        <button key={i.id} role="tab" aria-selected={valor === i.id} className={`tab ${valor === i.id ? 'on' : ''}`} onClick={() => onChange(i.id)}>
          {i.label}
          {i.count != null && <span className="tab-count">{i.count}</span>}
        </button>
      ))}
    </div>
  )
}

/* ---------------- Acordeón (formulario de registro) ---------------- */
export function Accordion({ titulo, abierto, onToggle, estado, children, icon }: { titulo: string; abierto: boolean; onToggle: () => void; estado?: 'ok' | 'pendiente'; children: ReactNode; icon?: IconName }) {
  return (
    <section className={`acc ${abierto ? 'open' : ''}`}>
      <button type="button" className="acc-head" onClick={onToggle} aria-expanded={abierto}>
        <span className="acc-title">
          {icon && <Icon name={icon} size={18} />}
          {titulo}
          {estado === 'ok' && <span className="acc-ok"><Icon name="check" size={13} /></span>}
        </span>
        <Icon name={abierto ? 'chevup' : 'chevdown'} size={18} />
      </button>
      {abierto && <div className="acc-body">{children}</div>}
    </section>
  )
}

/* ---------------- Modal ---------------- */
export function Modal({ abierto, onClose, titulo, children, pie, ancho = 560 }: { abierto: boolean; onClose: () => void; titulo: string; children: ReactNode; pie?: ReactNode; ancho?: number }) {
  const id = useId()
  useEffect(() => {
    if (!abierto) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', h); document.body.style.overflow = '' }
  }, [abierto, onClose])
  if (!abierto) return null
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={id} style={{ maxWidth: ancho }}>
        <div className="modal-head">
          <h3 id={id}>{titulo}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Cerrar"><Icon name="x" size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {pie && <div className="modal-foot">{pie}</div>}
      </div>
    </div>
  )
}

/* ---------------- Toasts ---------------- */
interface Toast { id: number; tipo: 'ok' | 'error' | 'info'; texto: string }
const ToastCtx = createContext<{ ok: (t: string) => void; error: (t: string) => void; info: (t: string) => void }>({ ok() {}, error() {}, info() {} })
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])
  const seq = useRef(0)
  const push = useCallback((tipo: Toast['tipo'], texto: string) => {
    const id = ++seq.current
    setItems((x) => [...x, { id, tipo, texto }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 4500)
  }, [])
  const api = { ok: (t: string) => push('ok', t), error: (t: string) => push('error', t), info: (t: string) => push('info', t) }
  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`}>
            <Icon name={t.tipo === 'ok' ? 'checkcircle' : t.tipo === 'error' ? 'xcircle' : 'info'} size={20} />
            <span>{t.texto}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ---------------- Hook de carga ---------------- */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let vivo = true
    setLoading(true)
    fn().then((d) => { if (vivo) { setData(d); setError(null) } })
      .catch((e: Error) => { if (vivo) setError(e.message) })
      .finally(() => { if (vivo) setLoading(false) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])
  return { data, error, loading, recargar: () => setTick((t) => t + 1), setData }
}
