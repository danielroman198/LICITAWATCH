import { useEffect, useState, type ReactNode } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider, Cargando } from './components/ui/ui'
import { Router, navigate, useLocation, type RouteDef } from './lib/router'
import type { Rol } from './api/types'
import { Splash } from './components/layout/Splash'
import { AppShell } from './components/layout/AppShell'
import { PublicPage } from './components/layout/PublicLayout'
import { Home } from './pages/public/Home'
import { RegisterChoice, RegisterForm } from './pages/public/Register'
import { Login, Recover, Reset, Bandeja, RevisaCorreo, Verificar } from './pages/public/Auth'
import { LicitadorDashboard } from './pages/licitador/Dashboard'
import { MyTenders, TenderForm } from './pages/licitador/Tenders'
import { PymeDashboard } from './pages/pyme/Dashboard'
import { Explore } from './pages/pyme/Explore'
import { MyApplications } from './pages/pyme/Applications'
import { Subscription } from './pages/pyme/Subscription'
import { Assistant } from './pages/pyme/Assistant'
import { AdminDashboard } from './pages/admin/Dashboard'
import { AdminUsers } from './pages/admin/Users'
import { AdminTenders } from './pages/admin/Tenders'
import { AdminSales } from './pages/admin/Sales'
import { TenderDetail } from './pages/common/TenderDetail'
import { Chat } from './pages/common/Chat'
import { Profile } from './pages/common/Profile'
import { Notifications } from './pages/common/Notifications'
import { Help } from './pages/common/Help'
import { Card, EmptyState, Button } from './components/ui/ui'

const solo = (roles: Rol[], el: ReactNode, rol?: Rol) => (rol && roles.includes(rol) ? el : <Card><EmptyState icon="lock" titulo="No tienes acceso a esta sección" accion={<Button onClick={() => navigate('/app')}>Ir a mi panel</Button>} /></Card>)

const publicas: RouteDef[] = [
  { path: '/', render: () => <Home /> },
  { path: '/registro', render: () => <RegisterChoice /> },
  { path: '/registro/licitador', render: () => <RegisterForm rol="LICITADOR" /> },
  { path: '/registro/pyme', render: () => <RegisterForm rol="PYME" /> },
  { path: '/login', render: () => <Login /> },
  { path: '/recuperar', render: () => <Recover /> },
  { path: '/restablecer', render: () => <Reset /> },
  { path: '/verifica-tu-correo', render: () => <RevisaCorreo /> },
  { path: '/verificar', render: () => <Verificar /> },
  { path: '/bandeja', render: () => <Bandeja /> },
]

function Privada() {
  const { sesion } = useAuth()
  const rol = sesion?.usuario.rol
  const rutas: RouteDef[] = [
    { path: '/app', render: () => rol === 'ADMIN' ? <AdminDashboard /> : rol === 'PYME' ? <PymeDashboard /> : <LicitadorDashboard /> },
    { path: '/app/licitaciones', render: () => solo(['LICITADOR'], <MyTenders />, rol) },
    { path: '/app/licitaciones/nueva', render: () => solo(['LICITADOR'], <TenderForm />, rol) },
    { path: '/app/licitacion/:id', render: (p) => <TenderDetail id={Number(p.id)} /> },
    { path: '/app/explorar', render: () => solo(['PYME'], <Explore />, rol) },
    { path: '/app/postulaciones', render: () => solo(['PYME'], <MyApplications />, rol) },
    { path: '/app/suscripcion', render: () => solo(['PYME'], <Subscription />, rol) },
    { path: '/app/asistente', render: () => solo(['PYME'], <Assistant />, rol) },
    { path: '/app/chat', render: () => solo(['LICITADOR', 'PYME'], <Chat />, rol) },
    { path: '/app/chat/:id', render: (p) => solo(['LICITADOR', 'PYME'], <Chat id={Number(p.id)} />, rol) },
    { path: '/app/notificaciones', render: () => <Notifications /> },
    { path: '/app/perfil', render: () => <Profile /> },
    { path: '/app/ayuda', render: () => <Help /> },
    { path: '/app/usuarios', render: () => solo(['ADMIN'], <AdminUsers />, rol) },
    { path: '/app/licitaciones-admin', render: () => solo(['ADMIN'], <AdminTenders />, rol) },
    { path: '/app/ventas', render: () => solo(['ADMIN'], <AdminSales />, rol) },
  ]
  return <AppShell><Router routes={rutas} fallback={<Card><EmptyState icon="search" titulo="Página no encontrada" accion={<Button onClick={() => navigate('/app')}>Ir a mi panel</Button>} /></Card>} /></AppShell>
}

function Rutas() {
  const { sesion, cargando } = useAuth()
  const { path } = useLocation()
  const enApp = path === '/app' || path.startsWith('/app/')
  useEffect(() => {
    if (cargando) return
    if (enApp && !sesion) navigate('/login', true)
    else if (sesion && ['/login', '/registro', '/registro/licitador', '/registro/pyme'].includes(path)) navigate('/app', true)
  }, [cargando, sesion, enApp, path])
  useEffect(() => { window.scrollTo(0, 0) }, [path])
  if (cargando) return <Cargando />
  if (enApp) return sesion ? <Privada /> : null
  return <Router routes={publicas} fallback={<PublicPage><Card><EmptyState icon="search" titulo="Página no encontrada" accion={<Button onClick={() => navigate('/')}>Ir al inicio</Button>} /></Card></PublicPage>} />
}

export default function App() {
  const [splash, setSplash] = useState(() => { try { return sessionStorage.getItem('lw_splash') !== '1' } catch { return true } })
  const fin = () => { try { sessionStorage.setItem('lw_splash', '1') } catch { /* sin storage */ } setSplash(false) }
  return (
    <ToastProvider>
      <AuthProvider>
        <Rutas />
        {splash && <Splash onDone={fin} />}
      </AuthProvider>
    </ToastProvider>
  )
}
