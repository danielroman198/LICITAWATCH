import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { api, USE_MOCK } from '../../api'
import type { ConsultaSii } from '../../api/types'
import { Link, navigate } from '../../lib/router'
import { Logo } from '../../components/layout/Logo'
import { PublicPage } from '../../components/layout/PublicLayout'
import { MapaChileVivo } from '../../components/layout/EscenasAuth'
import { MediaVideo } from '../../components/layout/MediaVideo'
import { Accordion, Badge, Button, Field, Input, Select, Textarea, useToast } from '../../components/ui/ui'
import { Icon } from '../../lib/icons'
import { esRutEmpresa, esRutPersona, formatearRut, limpiarRut, validarRut } from '../../lib/rut'
import { validarEmail, validarPassword } from '../../lib/format'
import { useCatalogos } from '../../context/AuthContext'
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
  const [conVideo, setConVideo] = useState(true) // si no existe /media/registro.mp4 se muestra el mapa animado
  const cat = useCatalogos()
  const toast = useToast()
  const [abierto, setAbierto] = useState<Paso>(0)
  const [enviando, setEnviando] = useState(false)

  // Paso 1: persona
  const [nombres, setNombres] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [rutPersona, setRutPersona] = useState('')
  const [rutPersonaOk, setRutPersonaOk] = useState<null | boolean>(null)
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
  // Campos que ya deben mostrar su error (el usuario salió del campo o presionó Continuar).
  const [vistos, setVistos] = useState<Record<string, boolean>>({})
  const ver = (...campos: string[]) => setVistos((v) => ({ ...v, ...Object.fromEntries(campos.map((c) => [c, true])) }))

  const ciudadesRegion = useMemo(() => cat.ciudades.filter((c) => c.regionId === regionId), [cat.ciudades, regionId])
  useEffect(() => { setCiudadId(0) }, [regionId])

  // RUT personal: apenas está completo y es válido, se revisa que no esté en otra cuenta.
  useEffect(() => {
    setRutPersonaOk(null)
    if (!validarRut(rutPersona) || !esRutPersona(rutPersona)) return
    let vigente = true
    const t = setTimeout(async () => {
      try { const d = await api.rutPersonaDisponible(rutPersona); if (vigente) setRutPersonaOk(d) } catch { /* se valida de nuevo al registrar */ }
    }, 350)
    return () => { vigente = false; clearTimeout(t) }
  }, [rutPersona])

  // Correo de acceso: lo mismo, apenas tiene formato válido se revisa que no tenga cuenta.
  useEffect(() => {
    setEmailOk(null)
    if (!validarEmail(email)) return
    let vigente = true
    const t = setTimeout(async () => {
      try { const d = await api.emailDisponible(email); if (vigente) setEmailOk(d) } catch { /* se valida de nuevo al registrar */ }
    }, 350)
    return () => { vigente = false; clearTimeout(t) }
  }, [email])

  const color = esPyme ? 'teal' : 'blue'
  const titulo = esPyme ? 'Crea tu cuenta de Pyme' : 'Crea tu cuenta de Licitador'

  // Errores calculados en vivo a partir de lo escrito: cambian apenas se corrige el campo.
  const err: Record<string, string | null> = {
    nombres: nombres.trim().length < 2 ? 'Ingresa tus nombres' : null,
    apellidos: apellidos.trim().length < 2 ? 'Ingresa tus apellidos' : null,
    rutPersona: !rutPersona ? 'Ingresa tu RUT personal'
      : !validarRut(rutPersona) ? 'RUT inválido (revisa el dígito verificador)'
      : !esRutPersona(rutPersona) ? 'Ingresa tu RUT personal, no el de la empresa'
      : rutPersonaOk === false ? 'Ese RUT personal ya está registrado en otra cuenta' : null,
    emailContacto: !validarEmail(emailContacto) ? 'Correo inválido' : null,
    telefono: telefono.replace(/\D/g, '').length < 8 ? 'Teléfono inválido' : null,
    regionId: !regionId ? 'Selecciona una región' : null,
    ciudadId: !ciudadId ? 'Selecciona una ciudad' : null,
    rutEmpresa: siiEstado === 'error' ? siiMsg : siiEstado !== 'ok' ? 'Valida el RUT de la empresa con el SII' : null,
    razonSocial: razonSocial.trim().length < 3 ? 'Ingresa la razón social' : null,
    rubroId: !rubroId ? 'Selecciona un rubro' : null,
    tamanoId: esPyme && !tamanoId ? 'Selecciona el tamaño de tu empresa' : null,
    descripcion: descripcion.trim().length < 20 ? 'Cuéntanos un poco más (mínimo 20 caracteres)' : null,
    email: !validarEmail(email) ? 'Correo inválido' : emailOk === false ? 'Ese correo ya tiene una cuenta' : null,
    password: validarPassword(password) || null,
    password2: !password2 ? 'Repite la contraseña' : password !== password2 ? 'Las contraseñas no coinciden' : null,
    terminos: !terminos ? 'Debes aceptar los términos' : null,
  }
  const CAMPOS: string[][] = [
    ['nombres', 'apellidos', 'rutPersona', 'emailContacto', 'telefono'],
    ['regionId', 'ciudadId'],
    ['rutEmpresa', 'razonSocial', 'rubroId', 'tamanoId', 'descripcion'],
    ['email', 'password', 'password2', 'terminos'],
  ]
  const pasoValido = (p: Paso) => CAMPOS[p].every((c) => !err[c])
  // El RUT personal y el SII avisan al instante aunque el campo no se haya marcado como visto.
  const errorDe = (c: string) => vistos[c] || (c === 'rutPersona' && (limpiarRut(rutPersona).length >= 9 || rutPersonaOk === false)) || (c === 'rutEmpresa' && siiEstado === 'error') ? err[c] : null
  // Verde apenas el campo es válido (texto = mensaje bajo el campo, true = solo borde).
  const okDe = (c: string, msg: string | true = true) => !err[c] ? msg : null

  const siguiente = (p: Paso) => {
    ver(...CAMPOS[p])
    if (pasoValido(p)) setAbierto((p + 1) as Paso)
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

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault()
    ver(...CAMPOS.flat())
    const malo = ([0, 1, 2, 3] as Paso[]).find((p) => !pasoValido(p))
    if (malo !== undefined) { setAbierto(malo); return }
    setEnviando(true)
    const base = {
      email, password, razonSocial, rutEmpresa, rutPersona, nombreContacto: `${nombres.trim()} ${apellidos.trim()}`,
      emailContacto, telefono: `+56 ${telefono.replace(/\D/g, '')}`, rubroId, ciudadId, descripcionEmpresa: descripcion,
      sitioWeb: sitioWeb || undefined, giro: sii?.giro, siiValidado: true,
    }
    try {
      const r = esPyme ? await api.registrarPyme({ ...base, tamanoEmpresaId: tamanoId }) : await api.registrarLicitador(base)
      toast.ok('¡Cuenta creada! Revisa tu correo para activarla.')
      navigate(`/verifica-tu-correo?email=${encodeURIComponent(r.email)}`, true)
    } catch (err) {
      toast.error((err as Error).message)
      const m = (err as Error).message.toLowerCase()
      if (m.includes('rut personal') || m.includes('rut de la persona')) { setRutPersonaOk(false); setAbierto(0) }
      else if (m.includes('rut de esa empresa') || m.includes('rut de la empresa') || m.includes('sii')) setAbierto(2)
      else if (m.includes('correo')) { setEmailOk(false); setAbierto(3) }
    } finally {
      setEnviando(false)
    }
  }

  const ok1 = pasoValido(0) && abierto > 0
  const ok2 = pasoValido(1) && abierto > 1
  const ok3 = pasoValido(2) && abierto > 2

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
                <Field label="Nombres" required error={errorDe('nombres')} ok={okDe('nombres')}><Input value={nombres} onChange={(e) => setNombres(e.target.value)} onBlur={() => ver('nombres')} placeholder="Ingresa tus nombres" autoComplete="given-name" /></Field>
                <Field label="Apellidos" required error={errorDe('apellidos')} ok={okDe('apellidos')}><Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} onBlur={() => ver('apellidos')} placeholder="Ingresa tus apellidos" autoComplete="family-name" /></Field>
              </div>
              <Field label="RUT personal" required error={errorDe('rutPersona')} ok={!err.rutPersona && rutPersonaOk ? 'RUT disponible' : null} hint="Identifica a la persona de contacto. Ej: 12.345.678-5">
                <Input icon="user" value={rutPersona} onChange={(e) => setRutPersona(formatearRut(e.target.value))} onBlur={() => ver('rutPersona')} placeholder="12.345.678-5" inputMode="text" maxLength={12} />
              </Field>
              <Field label="Correo de contacto" required error={errorDe('emailContacto')} ok={okDe('emailContacto', 'Correo válido')}><Input icon="mail" type="email" value={emailContacto} onChange={(e) => setEmailContacto(e.target.value)} onBlur={() => ver('emailContacto')} placeholder="correo@tuempresa.cl" /></Field>
              <Field label="Teléfono móvil" required error={errorDe('telefono')} ok={okDe('telefono', 'Teléfono válido')}>
                <span className="phone"><span className="phone-pre">🇨🇱 +56</span><Input value={telefono} onChange={(e) => setTelefono(e.target.value.replace(/[^\d ]/g, ''))} onBlur={() => ver('telefono')} placeholder="9 1234 5678" inputMode="tel" maxLength={13} /></span>
              </Field>
              <Button type="button" iconRight="arrowright" onClick={() => siguiente(0)} block>Continuar</Button>
            </Accordion>

            <Accordion titulo="Ubicación" icon="pin" abierto={abierto === 1} onToggle={() => setAbierto(abierto === 1 ? 3 : 1)} estado={ok2 ? 'ok' : undefined}>
              <div className="grid-2">
                <Field label="Región" required error={errorDe('regionId')} ok={okDe('regionId')}>
                  <Select value={regionId} onChange={(e) => setRegionId(Number(e.target.value))} onBlur={() => ver('regionId')}>
                    <option value={0}>Selecciona región</option>
                    {cat.regiones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </Select>
                </Field>
                <Field label="Ciudad" required error={errorDe('ciudadId')} ok={okDe('ciudadId')}>
                  <Select value={ciudadId} onChange={(e) => setCiudadId(Number(e.target.value))} onBlur={() => ver('ciudadId')} disabled={!regionId}>
                    <option value={0}>{regionId ? 'Selecciona ciudad' : 'Primero elige región'}</option>
                    {ciudadesRegion.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </Select>
                </Field>
              </div>
              <Button type="button" iconRight="arrowright" onClick={() => siguiente(1)} block>Continuar</Button>
            </Accordion>

            <Accordion titulo="Cuenta Empresa" icon="building" abierto={abierto === 2} onToggle={() => setAbierto(abierto === 2 ? 3 : 2)} estado={ok3 ? 'ok' : undefined}>
              <Field label="RUT de la empresa" required error={errorDe('rutEmpresa')} ok={siiEstado === 'ok'} hint="Lo validamos con el SII y debe ser único en la plataforma.">
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
              <Field label="Razón social" required error={errorDe('razonSocial')} ok={okDe('razonSocial')}>
                <Input icon="briefcase" value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} onBlur={() => ver('razonSocial')} placeholder="Nombre legal de la empresa" />
              </Field>
              <div className="grid-2">
                <Field label="Rubro" required error={errorDe('rubroId')} ok={okDe('rubroId')}>
                  <Select value={rubroId} onChange={(e) => setRubroId(Number(e.target.value))} onBlur={() => ver('rubroId')}>
                    <option value={0}>Selecciona rubro</option>
                    {cat.rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </Select>
                </Field>
                {esPyme ? (
                  <Field label="Tamaño de empresa" required error={errorDe('tamanoId')} ok={okDe('tamanoId')}>
                    <Select value={tamanoId} onChange={(e) => setTamanoId(Number(e.target.value))} onBlur={() => ver('tamanoId')}>
                      <option value={0}>Selecciona tamaño</option>
                      {cat.tamanos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    </Select>
                  </Field>
                ) : (
                  <Field label="Sitio web (opcional)"><Input icon="globe" value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} placeholder="https://tuempresa.cl" /></Field>
                )}
              </div>
              {esPyme && <Field label="Sitio web (opcional)"><Input icon="globe" value={sitioWeb} onChange={(e) => setSitioWeb(e.target.value)} placeholder="https://tuempresa.cl" /></Field>}
              <Field label="Descripción de la empresa" required error={errorDe('descripcion')} ok={okDe('descripcion')} hint={`${descripcion.length} caracteres`}>
                <Textarea rows={3} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} onBlur={() => ver('descripcion')} placeholder={esPyme ? 'Qué servicios ofreces y tu experiencia…' : 'Qué hace tu empresa y qué tipo de servicios contratas…'} />
              </Field>
              <Button type="button" iconRight="arrowright" onClick={() => siguiente(2)} block>Continuar</Button>
            </Accordion>

            <Accordion titulo="Acceso y contraseña" icon="lock" abierto={abierto === 3} onToggle={() => setAbierto(abierto === 3 ? 0 : 3)}>
              <Field label="Correo de acceso" required error={errorDe('email') ?? (emailOk === false ? err.email : null)} ok={!err.email && emailOk ? 'Correo disponible' : null} hint="Será tu usuario para iniciar sesión (único).">
                <Input icon="mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => ver('email')} placeholder="tu@correo.cl" autoComplete="email" />
              </Field>
              <Field label="Contraseña" required error={errorDe('password')} ok={okDe('password', 'Contraseña segura')} hint="Mínimo 8 caracteres, con mayúscula, minúscula y número.">
                <Input icon="lock" type={verPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => ver('password')} autoComplete="new-password"
                  right={<button type="button" className="icon-btn" onClick={() => setVerPass((v) => !v)} aria-label="Mostrar contraseña"><Icon name="eye" size={18} /></button>} />
              </Field>
              <Field label="Repetir contraseña" required error={errorDe('password2')} ok={okDe('password2', 'Las contraseñas coinciden')}>
                <Input icon="lock" type={verPass ? 'text' : 'password'} value={password2} onChange={(e) => setPassword2(e.target.value)} onBlur={() => ver('password2')} autoComplete="new-password" />
              </Field>
              <label className={`check ${errorDe('terminos') ? 'err' : ''}`}>
                <input type="checkbox" checked={terminos} onChange={(e) => setTerminos(e.target.checked)} />
                <span>Acepto los términos y la política de privacidad de LicitaWatch.</span>
              </label>
              {errorDe('terminos') && <span className="field-msg err"><Icon name="alert" size={14} />{err.terminos}</span>}
              <Button type="submit" size="lg" block loading={enviando} iconRight="arrowright">Crear cuenta</Button>
            </Accordion>
          </form>
          <p className="auth-foot">¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
        </div>
      </div>
      <aside className={`auth-art ${conVideo ? 'con-video' : ''}`}>
        <MediaVideo src="/media/registro.mp4" fallback={null} className="auth-art-video" onFalla={() => setConVideo(false)}>
          <div className="auth-art-velo" />
        </MediaVideo>
        <div className="auth-art-inner">
          <span className="eyebrow light"><i /> {esPyme ? 'Para Pymes' : 'Para Licitadores'}</span>
          <h2>{esPyme ? 'Encuentra tu próximo gran cliente' : 'Recibe las mejores propuestas, sin costo'}</h2>
          <ul>
            {(esPyme
              ? ['Búsqueda ilimitada por rubro y región', 'Postula en minutos y sigue tu estado', 'Chat directo al ser adjudicada', 'Sube a Premium cuando quieras']
              : ['Publica licitaciones gratis, sin límites', 'Pymes verificadas con el SII', 'Aprueba, rechaza y adjudica con un clic', 'Chat privado con la Pyme ganadora']
            ).map((t) => <li key={t}><Icon name="checkcircle" size={20} />{t}</li>)}
          </ul>
          {!conVideo && <MapaChileVivo />}
        </div>
      </aside>
    </div>
  )
}
