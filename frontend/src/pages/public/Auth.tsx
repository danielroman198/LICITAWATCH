import { useState, type FormEvent } from 'react'
import { api, USE_MOCK, mockApi } from '../../api'
import { Link, navigate, useLocation } from '../../lib/router'
import { Logo } from '../../components/layout/Logo'
import { MediaVideo, TabletDemo } from '../../components/layout/MediaVideo'
import { Button, Field, Input, useAsync, useToast, Cargando, EmptyState } from '../../components/ui/ui'
import { Icon } from '../../lib/icons'
import { useAuth } from '../../context/AuthContext'
import { validarEmail, validarPassword, fechaHora } from '../../lib/format'
import { PublicPage } from '../../components/layout/PublicLayout'

const DEMOS = [
  { rol: 'Licitador', email: 'licitador@demo.cl', pass: 'Demo1234!', icon: 'building' as const },
  { rol: 'Pyme Estándar', email: 'pyme@demo.cl', pass: 'Demo1234!', icon: 'briefcase' as const },
  { rol: 'Pyme Premium', email: 'premium@demo.cl', pass: 'Demo1234!', icon: 'crown' as const },
  { rol: 'Administrador', email: 'admin@licitawatch.cl', pass: 'Admin123!', icon: 'shield' as const },
]

export function Login() {
  const { login } = useAuth()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [ver, setVer] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (e?: FormEvent, creds?: { email: string; pass: string }) => {
    e?.preventDefault()
    const em = creds?.email ?? email
    const pw = creds?.pass ?? pass
    if (!validarEmail(em)) { setError('Ingresa un correo válido'); return }
    if (!pw) { setError('Ingresa tu contraseña'); return }
    setError(''); setCargando(true)
    try {
      await login(em, pw)
      toast.ok('¡Bienvenido de vuelta!')
      navigate('/app', true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="auth auth-login">
      <aside className="auth-video">
        <MediaVideo src="/media/login.mp4" fallback={<TabletDemo />} className="auth-video-el" />
        <div className="auth-video-caption">
          <Logo size={34} claro />
          <p>Todas tus licitaciones, en la palma de tu mano.</p>
        </div>
      </aside>
      <div className="auth-form-side">
        <div className="auth-form narrow">
          <Link to="/" className="back"><Icon name="arrowleft" size={16} /> Volver al inicio</Link>
          <div className="auth-logo"><Logo size={40} /></div>
          <h1>Inicia sesión</h1>
          <p className="auth-sub">Ingresa tus credenciales para acceder a tu panel.</p>
          <form onSubmit={(e) => enviar(e)} noValidate>
            <Field label="Correo electrónico" required><Input icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.cl" autoComplete="email" autoFocus /></Field>
            <Field label="Contraseña" required>
              <Input icon="lock" type={ver ? 'text' : 'password'} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="••••••••" autoComplete="current-password"
                right={<button type="button" className="icon-btn" onClick={() => setVer((v) => !v)} aria-label="Mostrar contraseña"><Icon name="eye" size={18} /></button>} />
            </Field>
            <div className="login-row"><Link to="/recuperar" className="link">¿Olvidaste tu contraseña?</Link></div>
            {error && <div className="alert alert-err"><Icon name="alert" size={18} />{error}</div>}
            <Button type="submit" size="lg" block loading={cargando} iconRight="arrowright">Iniciar sesión</Button>
          </form>
          <p className="auth-foot">¿Aún no tienes cuenta? <Link to="/registro">Regístrate gratis</Link></p>

          {USE_MOCK && (
            <div className="demo-box">
              <div className="demo-head"><Icon name="zap" size={16} /> Cuentas de demostración <small>(modo simulado)</small></div>
              <div className="demo-grid">
                {DEMOS.map((d) => (
                  <button key={d.email} type="button" onClick={() => { setEmail(d.email); setPass(d.pass); enviar(undefined, { email: d.email, pass: d.pass }) }}>
                    <Icon name={d.icon} size={18} /><span>{d.rol}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="link-btn" onClick={() => { mockApi.resetDemo(); toast.info('Datos de demostración restablecidos'); }}>Restablecer datos de demostración</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function Recover() {
  const [email, setEmail] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!validarEmail(email)) { setError('Ingresa un correo válido'); return }
    setError(''); setCargando(true)
    try { await api.solicitarRecuperacion(email); setEnviado(true) } catch (err) { setError((err as Error).message) } finally { setCargando(false) }
  }
  return (
    <div className="auth auth-center">
      <div className="auth-card">
        <Link to="/login" className="back"><Icon name="arrowleft" size={16} /> Volver al inicio de sesión</Link>
        <div className="auth-logo"><Logo size={40} /></div>
        {enviado ? (
          <div className="sent">
            <span className="sent-ic"><Icon name="mail" size={30} /></span>
            <h1>Revisa tu correo</h1>
            <p>Si <b>{email}</b> tiene una cuenta, te enviamos un enlace para restablecer tu contraseña. Vence en 1 hora.</p>
            {USE_MOCK && <Link to="/bandeja" className="btn btn-soft btn-md"><Icon name="inbox" size={18} /><span>Abrir bandeja simulada</span></Link>}
            <Link to="/login" className="btn btn-ghost btn-md"><span>Volver a iniciar sesión</span></Link>
          </div>
        ) : (
          <>
            <h1>Recupera tu contraseña</h1>
            <p className="auth-sub">Ingresa el correo con el que te registraste y te enviaremos un enlace para crear una nueva contraseña.</p>
            <form onSubmit={enviar} noValidate>
              <Field label="Correo de tu cuenta" required error={error}><Input icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.cl" autoFocus /></Field>
              <Button type="submit" size="lg" block loading={cargando}>Enviar enlace de recuperación</Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export function Reset() {
  const { search } = useLocation()
  const token = search.get('token') ?? ''
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const [cargando, setCargando] = useState(false)
  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    const v = validarPassword(p1)
    if (v) { setError(v); return }
    if (p1 !== p2) { setError('Las contraseñas no coinciden'); return }
    setError(''); setCargando(true)
    try { await api.restablecerPassword(token, p1); setOk(true) } catch (err) { setError((err as Error).message) } finally { setCargando(false) }
  }
  return (
    <div className="auth auth-center">
      <div className="auth-card">
        <div className="auth-logo"><Logo size={40} /></div>
        {ok ? (
          <div className="sent">
            <span className="sent-ic ok"><Icon name="checkcircle" size={30} /></span>
            <h1>¡Contraseña actualizada!</h1>
            <p>Ya puedes iniciar sesión con tu nueva contraseña.</p>
            <Link to="/login" className="btn btn-primary btn-lg"><span>Iniciar sesión</span></Link>
          </div>
        ) : (
          <>
            <h1>Crea una nueva contraseña</h1>
            <p className="auth-sub">Elige una contraseña segura que no hayas usado antes.</p>
            {!token && <div className="alert alert-err"><Icon name="alert" size={18} />El enlace no es válido. Solicita uno nuevo.</div>}
            <form onSubmit={enviar} noValidate>
              <Field label="Nueva contraseña" required hint="Mínimo 8 caracteres, con mayúscula, minúscula y número."><Input icon="lock" type="password" value={p1} onChange={(e) => setP1(e.target.value)} /></Field>
              <Field label="Repetir contraseña" required error={error}><Input icon="lock" type="password" value={p2} onChange={(e) => setP2(e.target.value)} /></Field>
              <Button type="submit" size="lg" block loading={cargando} disabled={!token}>Guardar contraseña</Button>
            </form>
            <p className="auth-foot"><Link to="/recuperar">Solicitar un enlace nuevo</Link></p>
          </>
        )}
      </div>
    </div>
  )
}

/** Bandeja de correos simulada: solo en modo mock. Muestra los emails que enviaría el microservicio de Notificaciones. */
export function Bandeja() {
  const { data, loading, recargar } = useAsync(() => mockApi.correos(), [])
  if (!USE_MOCK) return <PublicPage><div className="wrap" style={{ padding: 80 }}><EmptyState titulo="Disponible solo en modo simulado" /></div></PublicPage>
  return (
    <PublicPage>
      <section className="mailbox">
        <div className="wrap narrow-wrap">
          <div className="mailbox-head">
            <div>
              <h1 className="h1-sm"><Icon name="inbox" size={28} /> Bandeja de correos simulada</h1>
              <p>Aquí aparecen los correos que enviaría la API de Notificaciones (bienvenida, recuperación de contraseña, postulaciones…).</p>
            </div>
            <Button variant="soft" icon="refresh" onClick={recargar}>Actualizar</Button>
          </div>
          {loading ? <Cargando /> : data && data.length > 0 ? (
            <div className="mail-list">
              {data.map((m) => (
                <article key={m.id} className="mail">
                  <div className="mail-top"><b>{m.asunto}</b><small>{fechaHora(m.fecha)}</small></div>
                  <small className="mail-to">Para: {m.para}</small>
                  <p>{m.cuerpo}</p>
                  {m.enlace && <a className="btn btn-primary btn-sm" href={m.enlace}><span>Restablecer contraseña</span><Icon name="arrowright" size={16} /></a>}
                </article>
              ))}
            </div>
          ) : <EmptyState titulo="Aún no hay correos" texto="Solicita una recuperación de contraseña o regístrate para ver correos aquí." />}
        </div>
      </section>
    </PublicPage>
  )
}
