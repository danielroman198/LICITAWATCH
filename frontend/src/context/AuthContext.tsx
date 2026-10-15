import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api } from '../api'
import type { Catalogo, Ciudad, Perfil, Sesion, Usuario } from '../api/types'

interface AuthState {
  sesion: Sesion | null
  cargando: boolean
  login: (email: string, password: string) => Promise<Sesion>
  logout: () => Promise<void>
  setSesion: (s: Sesion | null) => void
  actualizarPerfil: (p: Perfil) => void
  actualizarUsuario: (u: Usuario) => void
}

const Ctx = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    api.sesionActual().then((s) => setSesion(s)).finally(() => setCargando(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const s = await api.login(email, password)
    setSesion(s)
    return s
  }, [])
  const logout = useCallback(async () => {
    await api.logout()
    setSesion(null)
  }, [])
  const actualizarPerfil = useCallback((p: Perfil) => setSesion((s) => (s ? { ...s, perfil: p } : s)), [])
  const actualizarUsuario = useCallback((u: Usuario) => setSesion((s) => (s ? { ...s, usuario: u } : s)), [])

  const value = useMemo(() => ({ sesion, cargando, login, logout, setSesion, actualizarPerfil, actualizarUsuario }), [sesion, cargando, login, logout, actualizarPerfil, actualizarUsuario])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth(): AuthState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return v
}

// ---------- Catálogos (se cargan una sola vez) ----------
interface Catalogos {
  rubros: Catalogo[]
  regiones: Catalogo[]
  ciudades: Ciudad[]
  tamanos: Catalogo[]
  rubro: (id?: number) => string
  region: (id?: number) => string
  ciudad: (id?: number) => string
  tamano: (id?: number) => string
  regionDeCiudad: (ciudadId?: number) => number | undefined
}

let cache: Promise<[Catalogo[], Catalogo[], Ciudad[], Catalogo[]]> | null = null
const cargar = () => (cache ??= Promise.all([api.rubros(), api.regiones(), api.ciudades(), api.tamanos()]))

export function useCatalogos(): Catalogos {
  const [d, setD] = useState<[Catalogo[], Catalogo[], Ciudad[], Catalogo[]]>([[], [], [], []])
  useEffect(() => {
    let vivo = true
    cargar().then((x) => { if (vivo) setD(x) })
    return () => { vivo = false }
  }, [])
  const [rubros, regiones, ciudades, tamanos] = d
  return useMemo(() => ({
    rubros, regiones, ciudades, tamanos,
    rubro: (id) => rubros.find((x) => x.id === id)?.nombre ?? '—',
    region: (id) => regiones.find((x) => x.id === id)?.nombre ?? '—',
    ciudad: (id) => ciudades.find((x) => x.id === id)?.nombre ?? '—',
    tamano: (id) => tamanos.find((x) => x.id === id)?.nombre ?? '—',
    regionDeCiudad: (id) => ciudades.find((x) => x.id === id)?.regionId,
  }), [rubros, regiones, ciudades, tamanos])
}
