import { useEffect, useState, type ReactNode } from 'react'
import { Link } from '../../lib/router'
import { Logo } from './Logo'
import { Button } from '../ui/ui'
import { Icon } from '../../lib/icons'
import { useAuth } from '../../context/AuthContext'

export function PublicNav() {
  const { sesion } = useAuth()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8)
    h()
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])
  const ir = (id: string) => {
    setOpen(false)
    if (window.location.pathname !== '/') { window.location.href = '/#' + id; return }
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return (
    <header className={`pnav ${scrolled ? 'scrolled' : ''}`}>
      <div className="pnav-in">
        <Link to="/" aria-label="LicitaWatch"><Logo size={36} /></Link>
        <nav className={`pnav-links ${open ? 'open' : ''}`}>
          <button onClick={() => ir('como-funciona')}>Cómo funciona</button>
          <button onClick={() => ir('licitadores')}>Licitadores</button>
          <button onClick={() => ir('pymes')}>Pymes</button>
          <button onClick={() => ir('planes')}>Planes</button>
          <button onClick={() => ir('asistente')}>LicitAsist</button>
        </nav>
        <div className="pnav-cta">
          {sesion ? (
            <Link to="/app" className="btn btn-primary btn-md"><span>Ir a mi panel</span><Icon name="arrowright" size={18} /></Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-md"><span>Iniciar sesión</span></Link>
              <Link to="/registro" className="btn btn-primary btn-md"><span>Registrarme</span></Link>
            </>
          )}
          <button className="icon-btn pnav-burger" onClick={() => setOpen((o) => !o)} aria-label="Menú"><Icon name={open ? 'x' : 'menu'} size={22} /></button>
        </div>
      </div>
    </header>
  )
}

export function Footer() {
  return (
    <footer className="pfoot">
      <div className="pfoot-in">
        <div className="pfoot-brand">
          <Logo size={34} />
          <p>La plataforma privada de licitaciones B2B que conecta a empresas que necesitan con Pymes que cumplen.</p>
          <div className="pfoot-chips">
            <span><Icon name="shieldcheck" size={14} /> Datos seguros</span>
            <span><Icon name="building" size={14} /> Empresas verificadas</span>
            <span><Icon name="pin" size={14} /> Hecho en Chile</span>
          </div>
        </div>
        <div>
          <h5>Plataforma</h5>
          <Link to="/registro/licitador">Registrarme como Licitador</Link>
          <Link to="/registro/pyme">Registrarme como Pyme</Link>
          <Link to="/login">Iniciar sesión</Link>
        </div>
        <div>
          <h5>Producto</h5>
          <a href="/#como-funciona">Cómo funciona</a>
          <a href="/#planes">Planes</a>
          <a href="/#asistente">LicitAsist (IA)</a>
        </div>
      </div>
      <div className="pfoot-bottom">© 2026 LicitaWatch · Proyecto de título · Todos los derechos reservados</div>
    </footer>
  )
}

export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="public">
      <PublicNav />
      {children}
      <Footer />
    </div>
  )
}

export { Button }
