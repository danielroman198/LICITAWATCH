import { useSyncExternalStore, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

// Router mínimo basado en History API (sin dependencias externas).

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((l) => l())
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', notify)
}

export function navigate(to: string, replace = false) {
  if (replace) window.history.replaceState({}, '', to)
  else window.history.pushState({}, '', to)
  window.scrollTo({ top: 0 })
  notify()
}

function subscribe(l: Listener) {
  listeners.add(l)
  return () => listeners.delete(l)
}

const getSnapshot = () => window.location.pathname + window.location.search

export function useLocation() {
  const full = useSyncExternalStore(subscribe, getSnapshot)
  const [path, search = ''] = full.split('?')
  return { path, search: new URLSearchParams(search) }
}

export type Params = Record<string, string>

export interface RouteDef {
  path: string
  render: (params: Params) => ReactNode
}

function match(pattern: string, path: string): Params | null {
  const a = pattern.split('/').filter(Boolean)
  const b = path.split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const params: Params = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}

export function Router({ routes, fallback }: { routes: RouteDef[]; fallback: ReactNode }) {
  const { path } = useLocation()
  for (const r of routes) {
    const p = match(r.path, path)
    if (p) return <>{r.render(p)}</>
  }
  return <>{fallback}</>
}

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
}

export function Link({ to, onClick, children, ...rest }: LinkProps) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}

export function isActive(current: string, to: string, exact = false) {
  return exact ? current === to : current === to || current.startsWith(to + '/')
}
