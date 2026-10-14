import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, USE_MOCK } from '../../api'
import type { ConsultaSii, Sesion } from '../../api/types'
import { Link, navigate } from '../../lib/router'
import { Logo } from '../../components/layout/Logo'
import { PublicPage } from '../../components/layout/PublicLayout'
import { Accordion, Badge, Button, Field, Input, Select, Textarea, useToast } from '../../components/ui/ui'
import { Icon } from '../../lib/icons'
import { esRutEmpresa, esRutPersona, formatearRut, validarRut } from '../../lib/rut'
import { validarEmail, validarPassword } from '../../lib/format'
import { useAuth, useCatalogos } from '../../context/AuthContext'
import { RUT_DE_PRUEBA } from '../../api/mock/sii'

export function RegisterChoice() {
  return (
    <PublicPage>
      <section className="choice">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Crear cuenta</span>
            <h1 className="h1-sm">¿Cómo quieres usar LicitaWatch?</h1>
            <p>Elige tu perfil. Podrás completar tu empresa y empezar en minutos.</p>
          </div>
          <div className="roles">
            <Link to="/registro/licitador" className="role role-lic role-link">
              <span className="role-ic"><Icon name="building" size={30} /></span>
              <h3>Registrarme como Licitador</h3>
              <p className="role-lead">Publica tus necesidades, recibe propuestas y adjudica. Es <b>gratis</b>.</p>
              <span className="role-go">Continuar <Icon name="arrowright" size={18} /></span>
            </Link>
            <Link to="/registro/pyme" className="role role-pyme role-link">
              <span className="role-ic"><Icon name="briefcase" size={30} /></span>
              <h3>Registrarme como Pyme</h3>
              <p className="role-lead">Encuentra licitaciones, postula y consigue nuevos clientes. Plan Estándar <b>gratis</b>.</p>
              <span className="role-go">Continuar <Icon name="arrowright" size={18} /></span>
            </Link>
          </div>
          <p className="choice-foot">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        </div>
      </section>
    </PublicPage>
  )
}

type Paso = 0 | 1 | 2 | 3

export function RegisterForm({ rol }: { rol: 'LICITADOR' | 'PYME' }) {
  const esPyme = rol === 'PYME'
  const cat = useCatalogos()
  const toast = useToast()
  const { setSesion } = useAuth()
  const [abierto, setAbierto] = useState<Paso>(0)
  const [enviando, setEnviando] = useState(false)

  // Paso 1: persona
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [rutPersona, setRutPersona] = useState('')
  const [emailContacto, setEmailContacto] = useState('')
  const [telefono, setTelefono] = useState('')
  // Paso 2: ubicación
  const [regionId, setRegionId] = useState(0)
  const [ciudadId, setCiudadId] = useState(0)
  // Paso 3: empresa
  const [rutEmpresa, setRutEmpresa] = useState('')
  const [sii, setSii] = useState<ConsultaSii | null>(null)
  const [siiEstado, setSiiEstado] = useState<'idle' | 'cargando' | 'ok' | 'error'>('idle')
  const [siiMsg, setSiiMsg] = useState('')
  const [razonSocial, setRazonSocial] = useState('')
  const [rubroId, setRubroId] = useState(0)
  const [tamanoId, setTamanoId] = useState(0)
  const [descripcion, setDescripcion] = useState('')
  const [sitioWeb, setSitioWeb] = useState('')
  // Paso 4: acceso
  const [email, setEmail] = useState('')
  const [emailOk, setEmailOk] = useState<null | boolean>(null)
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [verPass, setVerPass] = useState(false)
  const [terminos, setTerminos] = useState(false)
  const [errores, setErrores] = useState<Record<string, string>>({})

  const ciudadesRegion = useMemo(() => cat.ciudades.filter((c) => c.regionId === regionId), [cat.ciudades, regionId])
  useEffect(() => { setCiudadId(0) }, [regionId])

  const color = esPyme ? 'teal' : 'blue'
  const titulo = esPyme ? 'Crea tu cuenta de Pyme' : 'Crea tu cuenta de Licitador'

  const validarPaso1 = () => {
    const e: Record<string, string> = {}
    if (nombres.trim().length < 2) e.nombres = 'Ingresa tus nombres'
    if (apellidos.trim().length < 2) e.apellidos = 'Ingresa tus apellidos'
    if (!validarRut(rutPersona)) e.rutPersona = 'RUT inválido (revisa el dígito verificador)'
    else if (!esRutPersona(rutPersona)) e.rutPersona = 'Ingresa tu RUT personal, no el de la empresa'
    if (!validarEmail(emailContacto)) e.emailContacto = 'Correo inválido'
    if (telefono.replace(/\D/g, '').length < 8) e.telefono = 'Teléfono inválido'
    setErrores((x) => ({ ...x, ...e, ...(Object.keys(e).length ? {} : { nombres: '', apellidos: '', rutPersona: '', emailContacto: '', telefono: '' }) }))
    return Object.keys(e).length === 0
  }
  const validarPaso2 = () => {
    const e: Record<string, string> = {}
    if (!regionId) e.regionId = 'Selecciona una región'
    if (!ciudadId) e.ciudadId = 'Selecciona una ciudad'
    setErrores((x) => ({ ...x, regionId: '', ciudadId: '', ...e }))
    return Object.keys(e).length === 0
  }
  const validarPaso3 = () => {
    const e: Record<string, string> = {}
    if (siiEstado !== 'ok') e.rutEmpresa = 'Valida el RUT de la empresa con el SII'
    if (razonSocial.trim().length < 3) e.razonSocial = 'Ingresa la razón social'
    if (!rubroId) e.rubroId = 'Selecciona un rubro'
    if (esPyme && !tamanoId) e.tamanoId = 'Selecciona el tamaño de tu empresa'
    if (descripcion.trim().length < 20) e.descripcion = 'Cuéntanos un poco más (mínimo 20 caracteres)'
    setErrores((x) => ({ ...x, rutEmpresa: '', razonSocial: '', rubroId: '', tamanoId: '', descripcion: '', ...e }))
    return Object.keys(e).length === 0
  }

  const siguiente = (p: Paso) => {
    const ok = p === 0 ? validarPaso1() : p === 1 ? validarPaso2() : p === 2 ? validarPaso3() : true
    if (ok) setAbierto((p + 1) as Paso)
  }

  const validarSii = async () => {
    setSii(null)
    if (!validarRut(rutEmpresa)) { setSiiEstado('error'); setSiiMsg('El RUT no es válido (dígito verificador incorrecto).'); return }
    if (!esRutEmpresa(rutEmpresa)) { setSiiEstado('error'); setSiiMsg('Ese RUT es de una persona natural. Ingresa el RUT de la empresa.'); return }
    setSiiEstado('cargando'); setSiiMsg('')
    try {
      const disponible = await api.rutDisponible(rutEmpresa)
      if (!disponible) { setSiiEstado('error'); setSiiMsg('Ya existe una cuenta registrada con el RUT de esta empresa.'); return }
      const r = await api.consultarSii(rutEmpresa)
      setSii(r)
      setSiiEstado('ok')
      setRutEmpresa(r.rut)
      if (r.razonSocial) setRazonSocial(r.razonSocial)
    } catch (err) {
      setSiiEstado('error'); setSiiMsg((err as Error).message)
    }
  }

  const revisarEmail = async () => {
    if (!validarEmail(email)) { setEmailOk(null); return }
    try { setEmailOk(await api.emailDisponible(email)) } catch { setEmailOk(null) }
  }

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    const e: Record<string, string> = {}
    if (!validarEmail(email)) e.email = 'Correo inválido'
    else if (emailOk === false) e.email = 'Ese correo ya tiene una cuenta'
    const ep = validarPassword(password)
    if (ep) e.password = ep
    if (password !== password2) e.password2 = 'Las contraseñas no coinciden'
    if (!terminos) e.terminos = 'Debes aceptar los términos'
    setErrores((x) => ({ ...x, email: '', password: '', password2: '', terminos: '', ...e }))
    if (Object.keys(e).length) return
    if (!validarPaso1()) { setAbierto(0); return }
    if (!validarPaso2()) { setAbierto(1); return }
    if (!validarPaso3()) { setAbierto(2); return }
    setEnviando(true)
    const base = {
      email, password, razonSocial, rutEmpresa, rutPersona, nombreContacto: `${nombres.trim()} ${apellidos.trim()}`,
      emailContacto, telefono: `+56 ${telefono.replace(/\D/g, '')}`, rubroId, ciudadId, descripcionEmpresa: descripcion,
      sitioWeb: sitioWeb || undefined, giro: sii?.giro, siiValidado: true,
    }
    try {
      const s: Sesion = esPyme ? await api.registrarPyme({ ...base, tamanoEmpresaId: tamanoId }) : await api.registrarLicitador(base)
      setSesion(s)
      toast.ok('¡Cuenta creada! Te enviamos un correo de bienvenida.')
      navigate('/app', true)
    } catch (err) {
      toast.error((err as Error).message)
      const m = (err as Error).message.toLowerCase()
      if (m.includes('rut de esa empresa') || m.includes('rut de la empresa') || m.includes('sii')) setAbierto(2)
      else if (m.includes('correo')) setAbierto(3)
    } finally {
      setEnviando(false)
    }
  }

  const ok1 = !!nombres && !!apellidos && validarRut(rutPersona) && validarEmail(emailContacto) && telefono.replace(/\D/g, '').length >= 8 && abierto > 0
  const ok2 = !!regionId && !!ciudadId && abierto > 1
  const ok3 = siiEstado === 'ok' && !!rubroId && abierto > 2

  return (
    <div className={`auth auth-${color}`}>
      <div className="auth-form-side">
        <div className="auth-form">
          <Link to="/registro" className="back"><Icon name="arrowleft" size={16} /> Volver</Link>
          <div className="auth-logo"><Logo size={40} /></div>
          <h1>{titulo}</h1>
          <p className="auth-sub">Completa tus datos personales y de empresa para empezar.</p>
          <Badge tono={esPyme ? 'teal' : 'blue'} icon={esPyme ? 'briefcase' : 'building'}>{esPyme ? 'Perfil Pyme · plan Estándar gratis' : 'Perfil Licitador · 100% gratis'}</Badge>

          <form onSubmit={enviar} noValidate className="acc-list">
            <Accordion titulo="Información personal" icon="user" abierto={abierto === 0} onToggle={() => setAbierto(abierto === 0 ? 3 : 0)} estado={ok1 ? 'ok' : undefined}>
              <div className="grid-2">
                <Field label="Nombres" required error={errores.nombres}><Input value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder="Ingresa tus nombres" autoComplete="given-name" /></Field>
                <Field label="Apellidos" required error={errores.apellidos}><Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Ingresa tus apellidos" autoComplete="family-name" /></Field>
              </div>
              <Field label="RUT personal" required error={errores.rutPersona} hint="Identifica a la persona de contacto. Ej: 12.345.678-5">
                <Input icon="user" value={rutPersona} onChange={(e) => setRutPersona(formatearRut(e.target.value))} placeholder="12.345.678-5" inputMode="text" maxLength={12} />
              </Field>
              <Field label="Correo de contacto" required error={errores.emailContacto}><Input icon="mail" type="email" value={emailContacto} onChange={(e) => setEmailContacto(e.target.value)} placeholder="correo@tuempresa.cl" /></Field>
              <Field label="Teléfono móvil" required error={errores.telefono}>
                <span className="phone"><span className="phone-pre">🇨🇱 +56</span><Input value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/[^\d ]/g, ''))} placeholder="9 1234 5678" inputMode="tel" maxLength={13} /></span>
              </Field>
              <Button type="button" iconRight="arrowright" onClick={() => siguiente(0)} block>Continuar</Button>
            </Accordion>

            <Accordion titulo="Ubicación" icon="pin" abierto={abierto === 1} onToggle={() => setAbierto(abierto === 1 ? 3 : 1)} estado={ok2 ? 'ok' : undefined}>
              <div className="grid-2">
                <Field label="Región" required error={errores.regionId}>
                  <Select value={regionId} onChange={(e) => setRegionId(Number(e.target.value))}>
                    <option value={0}>Selecciona región</option>
                    {cat.regiones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </Select>
                </Field>
                <Field label="Ciudad / comuna" required error={errores.ciudadId}>
                  <Select value={ciudadId} onChange={(e) => setCiudadId(Number(e.target.value))} disabled={!regionId}>
                    <option value={0}>{regionId ? 'Selecciona ciudad' : 'Primero elige región'}</option>
                    {ciudadesRegion.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </Select>
                </Field>
              </div>
              <Button type="button" iconRight="arrowright" onClick={() => siguiente(1)} block>Continuar</Button>
            </Accordion>

            <Accordion titulo="Cuenta Empresa" icon="building" abierto={abierto === 2} onToggle={() => setAbierto(abierto === 2 ? 3 : 2)} estado={ok3 ? 'ok' : undefined}>
              <Field label="RUT de la empresa" required error={errores.rutEmpresa || (siiEstado === 'error' ? siiMsg : null)} hint="Lo validamos con el SII y debe ser único en la plataforma.">
                <span className="rut-row">
                  <Input icon="building" value={rutEmpresa} onChange={(e) => { setRutEmpresa(formatearRut(e.target.value)); setSiiEstado('idle'); setSii(null) }} placeholder="76.123.456-K" maxLength={12} />
                  <Button type="button" variant={siiEstado === 'ok' ? 'success' : 'soft'} loading={siiEstado === 'cargando'} icon={siiEstado === 'ok' ? 'shieldcheck' : 'search'} onClick={validarSii}>
                    {siiEstado === 'ok' ? 'Validado' : 'Validar en SII'}
                  </Button>
                </span>
              </Field>
              {USE_MOCK && siiEstado !== 'ok' && (
                <div className="rut-tests">
                  <small>RUT públicos para probar:</small>
                  {RUT_DE_PRUEBA.slice(0, 5).map((r) => <button type="button" key={r} onClick={() => { setRutEmpresa(r); setSiiEstado('idle') }}>{r}</button>)}
                </div>
              )}
              {siiEstado === 'ok' && sii && (
                <div className="sii-ok">
                  <div className="sii-head"><Icon name="shieldcheck" size={20} /><b>Empresa verificada en el SII</b>{sii.modoPruebas && <Badge tono="amber">modo pruebas</Badge>}</div>
                  <ul>
                    <li><Icon name="check" size={14} /> RUT con dígito verificador válido</li>
                    <li><Icon name="check" size={14} /> RUT de empresa disponible en LicitaWatch</li>
                    <li><Icon name="check" size={14} /> {sii.estado}</li>
                  </ul>
                  <small>{sii.giro}</small>
                </div>
              )}
              <Field label="Razón social" required error={errores.razonSocial}>
                <Input icon="briefcase" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="Nombre legal de la empresa" />
              </Field>
              <div className="grid-2">
                <Field label="Rubro" required error={errores.rubroId}>
                  <Select value={rubroId} onChange={(e) => setRubroId(Number(e.target.value))}>
                    <option value={0}>Selecciona rubro</option>
                    {cat.rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </Select>
                </Field>
                {esPyme ? (
                  <Field label="Tamaño de empresa" required error={errores.tamanoId}>
                    <Select value={tamanoId} onChange={(e) => setTamanoId(Number(e.target.value))}>
                      <option value={0}>Selecciona tamaño</option>
                      {cat.tamanos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </Select>
                  </Field>
                ) : (
                  <Field label="Sitio web (opcional)"><Input icon="globe" value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} placeholder="https://tuempresa.cl" /></Field>
                )}
              </div>
              {esPyme && <Field label="Sitio web (opcional)"><Input icon="globe" value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} placeholder="https://tuempresa.cl" /></Field>}
              <Field label="Descripción de la empresa" required error={errores.descripcion} hint={`${descripcion.length} caracteres`}>
                <Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder={esPyme ? 'Qué servicios ofreces y tu experiencia…' : 'Qué hace tu empresa y qué tipo de servicios contratas…'} />
              </Field>
              <Button type="button" iconRight="arrowright" onClick={() => siguiente(2)} block>Continuar</Button>
            </Accordion>

            <Accordion titulo="Acceso y contraseña" icon="lock" abierto={abierto === 3} onToggle={() => setAbierto(abierto === 3 ? 0 : 3)}>
              <Field label="Correo de acceso" required error={errores.email || (emailOk === false ? 'Ese correo ya tiene una cuenta' : null)} ok={emailOk ? 'Correo disponible' : null} hint="Será tu usuario para iniciar sesión (único).">
                <Input icon="mail" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailOk(null) }} onBlur={revisarEmail} placeholder="tu@correo.cl" autoComplete="email" />
              </Field>
              <Field label="Contraseña" required error={errores.password} hint="Mínimo 8 caracteres, con mayúscula, minúscula y número.">
                <Input icon="lock" type={verPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password"
                  right={<button type="button" className="icon-btn" onClick={() => setVerPass((v) => !v)} aria-label="Mostrar contraseña"><Icon name="eye" size={18} /></button>} />
              </Field>
              <Field label="Repetir contraseña" required error={errores.password2}>
                <Input icon="lock" type={verPass ? 'text' : 'password'} value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
              </Field>
              <label className={`check ${errores.terminos ? 'err' : ''}`}>
                <input type="checkbox" checked={terminos} onChange={(e) => setTerminos(e.target.checked)} />
                <span>Acepto los términos y la política de privacidad de LicitaWatch.</span>
              </label>
              {errores.terminos && <span className="field-msg err"><Icon name="alert" size={14} />{errores.terminos}</span>}
              <Button type="submit" size="lg" block loading={enviando} iconRight="arrowright">Crear cuenta</Button>
            </Accordion>
          </form>
          <p className="auth-foot">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        </div>
      </div>
      <aside className="auth-art">
        <div className="auth-art-inner">
          <span className="eyebrow light"><i /> {esPyme ? 'Para Pymes' : 'Para Licitadores'}</span>
          <h2>{esPyme ? 'Encuentra tu próximo gran cliente' : 'Recibe las mejores propuestas, sin costo'}</h2>
          <ul>
            {(esPyme
              ? ['Búsqueda ilimitada por rubro y región', 'Postula en minutos y sigue tu estado', 'Chat directo al ser adjudicada', 'Sube a Premium cuando quieras']
              : ['Publica licitaciones gratis, sin límites', 'Pymes verificadas con el SII', 'Aprueba, rechaza y adjudica con un clic', 'Chat privado con la Pyme ganadora']
            ).map((t) => <li key={t}><Icon name="checkcircle" size={20} />{t}</li>)}
          </ul>
          <div className="art-card">
            <div className="art-row"><span className="art-pill">Abierta</span><b>Construcción de bodega logística</b></div>
            <div className="art-meta"><span><Icon name="pin" size={14} /> Santiago</span><span><Icon name="dollar" size={14} /> $45M – $68M</span><span><Icon name="users" size={14} /> 4 postulantes</span></div>
          </div>
        </div>
      </aside>
    </div>
  )
}
