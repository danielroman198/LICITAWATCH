import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Perfil } from '../../api/types'
import { Avatar, Badge, Button, Card, CardHeader, Field, Input, Modal, PageHeader, Select, Textarea } from '../../components/ui/ui'
import { NotifPanel } from '../../components/app/shared'
import { useAuth, useCatalogos } from '../../context/AuthContext'
import { Icon } from '../../lib/icons'
import { formatearRut } from '../../lib/rut'
import { fotoCuadrada, TIPOS_FOTO } from '../../lib/imagen'
import { validarEmail, fechaCorta } from '../../lib/format'

export function Profile() {
  const { sesion, actualizarPerfil, actualizarUsuario } = useAuth()
  const cat = useCatalogos()
  const [editando, setEditando] = useState(false)
  const [f, setF] = useState<Perfil>(sesion!.perfil)
  const [regionId, setRegionId] = useState<number>(0)
  const [guardando, setGuardando] = useState(false)
  // Pop-up con el resultado de guardar el perfil (éxito o error).
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null)
  const { usuario: u, perfil: p } = sesion!
  const esAdmin = u.rol === 'ADMIN'

  useEffect(() => { setRegionId(cat.regionDeCiudad(f.ciudadId) ?? 0) }, [cat.ciudades.length, f.ciudadId]) // eslint-disable-line
  const set = <K extends keyof Perfil>(k: K, v: Perfil[K]) => setF((x) => ({ ...x, [k]: v }))
  const cancelar = () => { setF(p); setEditando(false) }
  const guardar = async () => {
    if (!f.razonSocial.trim() || !f.nombreContacto.trim()) return setResultado({ ok: false, mensaje: 'Razón social y nombre de contacto son obligatorios.' })
    if (!validarEmail(f.emailContacto)) return setResultado({ ok: false, mensaje: 'El correo de contacto no es válido.' })
    setGuardando(true)
    try {
      const n = await api.actualizarPerfil(f); actualizarPerfil(n); setEditando(false)
      setResultado({ ok: true, mensaje: 'Tus datos se guardaron correctamente.' })
    } catch (e) {
      setResultado({ ok: false, mensaje: (e as Error).message || 'Inténtalo nuevamente en unos minutos.' })
    } finally { setGuardando(false) }
  }

  // Foto de perfil: se recorta y comprime en el navegador y se guarda al tiro (no depende de «Editar»).
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const cambiarFoto = async (archivo: File | null) => {
    setSubiendoFoto(true)
    try {
      const foto = archivo ? await fotoCuadrada(archivo) : null
      actualizarUsuario(await api.actualizarFoto(foto))
      setResultado({ ok: true, mensaje: foto ? 'Tu foto de perfil se actualizó.' : 'Quitamos tu foto de perfil.' })
    } catch (e) {
      setResultado({ ok: false, mensaje: (e as Error).message || 'No pudimos guardar la foto. Inténtalo nuevamente.' })
    } finally { setSubiendoFoto(false) }
  }

  const dato = (icon: Parameters<typeof Icon>[0]['name'], label: string, valor?: string) => (
    <div className="dato"><Icon name={icon} size={18} /><div><small>{label}</small><b>{valor || '—'}</b></div></div>
  )

  return (
    <div className="stack">
      <PageHeader title="Mi perfil" subtitle="Estos son los datos que ingresaste al registrarte." />
      <div className="grid-main">
        <div className="stack">
          <Card pad={false} className="profile-card">
            <div className="profile-banner" />
            <div className="profile-head">
              <div className="avatar-edit">
                <Avatar nombre={p.razonSocial} size={84} foto={u.foto} />
                <label className={`avatar-edit-btn ${subiendoFoto ? 'cargando' : ''}`} title={u.foto ? 'Cambiar foto' : 'Subir foto'}>
                  <Icon name="image" size={16} />
                  <input type="file" accept={TIPOS_FOTO.join(',')} hidden disabled={subiendoFoto} onChange={(e) => { const a = e.target.files?.[0]; e.target.value = ''; if (a) cambiarFoto(a) }} />
                </label>
                {u.foto && <button type="button" className="avatar-quitar" onClick={() => cambiarFoto(null)} disabled={subiendoFoto}>Quitar foto</button>}
              </div>
              <div className="profile-id">
                <h2>{p.razonSocial}</h2>
                <div className="td-badges">
                  <Badge tono={u.rol === 'ADMIN' ? 'violet' : u.rol === 'PYME' ? 'teal' : 'blue'} icon="briefcase">{u.rol === 'ADMIN' ? 'Administrador' : u.rol === 'PYME' ? 'Pyme' : 'Licitador'}</Badge>
                  {!esAdmin && (p.siiValidado ? <Badge tono="green" icon="shieldcheck">Verificada en el SII</Badge> : <Badge tono="amber" icon="alert">RUT sin verificar</Badge>)}
                </div>
              </div>
              {!editando && !esAdmin && <Button variant="outline" icon="edit" onClick={() => setEditando(true)}>Editar</Button>}
            </div>
          </Card>

          {!editando ? (
            <Card>
              <CardHeader icon="user" title="Información" />
              <div className="datos">
                {dato('mail', 'Correo de acceso', u.email)}
                {!esAdmin && <>
                  {dato('building', 'RUT de empresa', formatearRut(p.rutEmpresa))}
                  {dato('user', 'RUT de persona', formatearRut(p.rutPersona))}
                  {dato('briefcase', 'Giro', p.giro)}
                  {dato('tag', 'Rubro', cat.rubro(p.rubroId))}
                  {u.rol === 'PYME' && dato('layers', 'Tamaño de empresa', cat.tamano(p.tamanoEmpresaId))}
                  {dato('pin', 'Ubicación', `${cat.ciudad(p.ciudadId)}, ${cat.region(cat.regionDeCiudad(p.ciudadId))}`)}
                  {dato('user', 'Contacto', p.nombreContacto)}
                  {dato('mail', 'Correo de contacto', p.emailContacto)}
                  {dato('phone', 'Teléfono', p.telefono)}
                  {dato('globe', 'Sitio web', p.sitioWeb)}
                </>}
                {dato('calendar', 'Miembro desde', fechaCorta(u.createdAt))}
              </div>
              {!esAdmin && <><h4 className="sec-t">Descripción de la empresa</h4><p className="prose">{p.descripcionEmpresa || 'Sin descripción.'}</p></>}
            </Card>
          ) : (
            <Card>
              <CardHeader icon="edit" title="Editar información" />
              <div className="form-grid">
                <Field label="Correo de acceso" hint="No se puede modificar"><Input icon="mail" value={u.email} disabled /></Field>
                <Field label="RUT de empresa" hint="No se puede modificar"><Input icon="building" value={formatearRut(p.rutEmpresa)} disabled /></Field>
                <Field label="RUT personal" hint="No se puede modificar"><Input icon="user" value={formatearRut(p.rutPersona)} disabled /></Field>
                <Field label="Razón social" required><Input value={f.razonSocial} onChange={(e) => set('razonSocial', e.target.value)} /></Field>
                <Field label="Giro"><Input value={f.giro ?? ''} onChange={(e) => set('giro', e.target.value)} /></Field>
                <Field label="Rubro"><Select value={f.rubroId} onChange={(e) => set('rubroId', Number(e.target.value))}>{cat.rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select></Field>
                {u.rol === 'PYME' && <Field label="Tamaño de empresa"><Select value={f.tamanoEmpresaId} onChange={(e) => set('tamanoEmpresaId', Number(e.target.value))}>{cat.tamanos.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select></Field>}
                <Field label="Región"><Select value={regionId} onChange={(e) => { const r = Number(e.target.value); setRegionId(r); set('ciudadId', cat.ciudades.find((c) => c.regionId === r)?.id ?? 0) }}>{cat.regiones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select></Field>
                <Field label="Ciudad"><Select value={f.ciudadId} onChange={(e) => set('ciudadId', Number(e.target.value))}>{cat.ciudades.filter((c) => c.regionId === regionId).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select></Field>
                <Field label="Nombre de contacto" required><Input value={f.nombreContacto} onChange={(e) => set('nombreContacto', e.target.value)} /></Field>
                <Field label="Correo de contacto" required><Input value={f.emailContacto} onChange={(e) => set('emailContacto', e.target.value)} /></Field>
                <Field label="Teléfono"><Input value={f.telefono} onChange={(e) => set('telefono', e.target.value)} /></Field>
                <Field label="Sitio web"><Input value={f.sitioWeb ?? ''} onChange={(e) => set('sitioWeb', e.target.value)} /></Field>
                <Field label="Descripción de la empresa" className="span-2"><Textarea rows={4} value={f.descripcionEmpresa} onChange={(e) => set('descripcionEmpresa', e.target.value)} /></Field>
              </div>
              <div className="form-actions"><Button variant="ghost" onClick={cancelar}>Cancelar</Button><Button icon="check" loading={guardando} onClick={guardar}>Guardar cambios</Button></div>
            </Card>
          )}
        </div>
        <NotifPanel limite={5} />
      </div>

      <Modal abierto={!!resultado} onClose={() => setResultado(null)} titulo={resultado?.ok ? 'Perfil actualizado' : 'No se pudo guardar'} ancho={420}
        pie={<Button variant={resultado?.ok ? 'primary' : 'outline'} onClick={() => setResultado(null)}>{resultado?.ok ? 'Aceptar' : 'Volver a intentar'}</Button>}>
        {resultado && (resultado.ok
          ? <div className="pay-result ok"><Icon name="checkcircle" size={56} /><h3>¡Cambio realizado con éxito!</h3><p>{resultado.mensaje}</p></div>
          : <div className="pay-result bad"><Icon name="xcircle" size={56} /><h3>El cambio no fue exitoso</h3><p>{resultado.mensaje}</p></div>)}
      </Modal>
    </div>
  )
}
