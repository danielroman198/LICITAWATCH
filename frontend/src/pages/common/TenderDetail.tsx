import { useState } from 'react'
import { api } from '../../api'
import { ApiError } from '../../api/errors'
import type { Plan, Postulacion } from '../../api/types'
import { Avatar, Badge, Button, Card, CardHeader, Cargando, EmptyState, Field, Modal, Progress, Textarea, tonoEstado, useAsync, useToast } from '../../components/ui/ui'
import { VolverLink } from '../../components/app/shared'
import { useAuth, useCatalogos } from '../../context/AuthContext'
import { Icon } from '../../lib/icons'
import { navigate } from '../../lib/router'
import { diasHasta, fechaCorta, hace, rangoPresupuesto, clp } from '../../lib/format'

export function TenderDetail({ id }: { id: number }) {
  const { sesion } = useAuth()
  const cat = useCatalogos()
  const toast = useToast()
  const rol = sesion!.usuario.rol
  const lic = useAsync(() => api.licitacion(id), [id])
  const l = lic.data
  const esDueno = rol === 'LICITADOR' && l?.licitadorId === sesion!.usuario.id
  const posts = useAsync(() => (esDueno || rol === 'ADMIN' ? api.postulantes(id) : Promise.resolve([] as Postulacion[])), [id, esDueno, rol])
  const mias = useAsync(() => (rol === 'PYME' ? api.misPostulaciones() : Promise.resolve([] as Postulacion[])), [id, rol])
  const sub = useAsync(() => (rol === 'PYME' ? api.miSuscripcion() : Promise.resolve(null)), [id, rol])
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [confirmar, setConfirmar] = useState<{ tipo: 'adjudicar' | 'cerrar' | 'eliminar'; p?: Postulacion } | null>(null)
  const [limite, setLimite] = useState(false)   // pop-up: alcanzó las postulaciones del mes
  const [premium, setPremium] = useState<Plan | null>(null)

  if (lic.loading) return <Cargando />
  if (!l) return <Card><EmptyState icon="alert" titulo="No encontramos esta licitación" texto={lic.error ?? undefined} accion={<Button onClick={() => navigate('/app')}>Volver al panel</Button>} /></Card>

  const miPost = mias.data?.find((p) => p.licitacionId === l.id)
  const dias = diasHasta(l.fechaCierre)
  const abierta = l.estado === 'Abierta' && dias >= 0
  const restantes = sub.data ? Math.max(0, sub.data.plan.postulacionesMes - sub.data.postulacionesUsadas) : 0
  const volver = rol === 'PYME' ? { to: '/app/explorar', t: 'Explorar licitaciones' } : rol === 'ADMIN' ? { to: '/app/licitaciones-admin', t: 'Licitaciones' } : { to: '/app/licitaciones', t: 'Mis licitaciones' }

  const recargar = () => { lic.recargar(); posts.recargar(); mias.recargar(); sub.recargar() }

  // Al llegar al límite del plan el botón sigue activo (el mensaje escrito no se pierde) y se muestra el pop-up recomendando Premium.
  const avisarLimite = () => {
    setLimite(true)
    if (!premium) api.planes().then((ps) => setPremium(ps.find((p) => p.nombre === 'Premium') ?? null)).catch(() => { /* el pop-up funciona sin el detalle */ })
  }
  const postular = async () => {
    if (sub.data && restantes <= 0) { avisarLimite(); return }
    setEnviando(true)
    try { await api.postular(l.id, mensaje); toast.ok('¡Postulación enviada! Te avisaremos cuando el Licitador la revise.'); setMensaje(''); recargar() }
    catch (e) {
      if (e instanceof ApiError && e.status === 422) { avisarLimite(); sub.recargar() }   // el backend también valida el límite
      else toast.error((e as Error).message)
    } finally { setEnviando(false) }
  }
  const decidir = async (p: Postulacion, estado: 'Aprobada' | 'Rechazada') => {
    try { await api.decidirPostulacion(p.id, estado); toast.ok(estado === 'Aprobada' ? 'Postulación aprobada.' : 'Postulación rechazada.'); recargar() }
    catch (e) { toast.error((e as Error).message) }
  }
  const ejecutarConfirmacion = async () => {
    if (!confirmar) return
    try {
      if (confirmar.tipo === 'adjudicar' && confirmar.p) { const r = await api.adjudicar(confirmar.p.id); toast.ok('¡Licitación adjudicada! Se abrió el chat con la Pyme.'); recargar(); if (r.conversacionId) setTimeout(() => navigate(`/app/chat/${r.conversacionId}`), 700) }
      if (confirmar.tipo === 'cerrar') { await api.cerrarLicitacion(l.id); toast.ok('Licitación cerrada.'); recargar() }
      if (confirmar.tipo === 'eliminar') { await api.eliminarLicitacion(l.id); toast.ok('Licitación eliminada.'); setConfirmar(null); navigate('/app/licitaciones', true); return }
    } catch (e) { toast.error((e as Error).message) }
    setConfirmar(null)
  }

  return (
    <div className="stack">
      <VolverLink to={volver.to} texto={volver.t} />
      <Card pad={false} className="td-hero">
        <div className="td-cover" style={l.imagenUrl ? { backgroundImage: `url(${l.imagenUrl})` } : undefined}>
          {!l.imagenUrl && <Icon name="file" size={56} />}
        </div>
        <div className="td-head">
          <div className="td-badges">
            <Badge tono={tonoEstado(l.estado)} dot>{l.estado}</Badge>
            <Badge tono="gray" icon="tag">{cat.rubro(l.rubroId)}</Badge>
            {abierta && dias <= 5 && <Badge tono="amber" icon="clock">Cierra {dias === 0 ? 'hoy' : `en ${dias} días`}</Badge>}
          </div>
          <h1>{l.titulo}</h1>
          <p className="td-emp"><Icon name="building" size={16} />{l.licitadorNombre}</p>
          <div className="td-facts">
            <div><Icon name="dollar" size={18} /><span>Presupuesto</span><b>{rangoPresupuesto(l.presupuestoMin, l.presupuestoMax)}</b></div>
            <div><Icon name="pin" size={18} /><span>Región</span><b>{cat.region(l.regionId)}</b></div>
            <div><Icon name="calendar" size={18} /><span>Cierre</span><b>{fechaCorta(l.fechaCierre)}</b></div>
            <div><Icon name="users" size={18} /><span>Postulantes</span><b>{l.postulantes}{l.maxPostulantes ? ` / ${l.maxPostulantes}` : ''}</b></div>
          </div>
        </div>
      </Card>

      <div className="grid-main">
        <div className="stack">
          <Card>
            <CardHeader icon="file" title="Descripción" />
            <p className="prose">{l.descripcion}</p>
          </Card>
          <Card>
            <CardHeader icon="paperclip" title="Documentos adjuntos" />
            {l.documentos.length === 0 ? <p className="muted-p">El Licitador no adjuntó documentos.</p> : (
              <ul className="doc-list">
                {l.documentos.map((d) => (
                  <li key={d.nombre}><span className="doc-ic"><Icon name="file" size={18} /></span><div><b>{d.nombre}</b><small>{d.tipo} · {d.tamanoKb} KB</small></div><Icon name="download" size={18} className="muted-ic" /></li>
                ))}
              </ul>
            )}
          </Card>

          {(esDueno || rol === 'ADMIN') && (
            <Card>
              <CardHeader icon="users" title={`Postulaciones recibidas (${posts.data?.length ?? 0})`} subtitle={esDueno ? 'Aprueba o rechaza, y adjudica a la Pyme elegida. Las Premium aparecen primero.' : 'Vista de solo lectura'} />
              {posts.loading ? <Cargando /> : !posts.data || posts.data.length === 0 ? <EmptyState icon="inbox" titulo="Aún no hay postulaciones" texto="Cuando una Pyme postule, la verás aquí." /> : (
                <div className="applicants">
                  {posts.data.map((p) => (
                    <div key={p.id} className={`applicant ${p.adjudicada ? 'win' : ''}`}>
                      <Avatar nombre={p.pymeNombre} size={44} />
                      <div className="applicant-main">
                        <div className="applicant-top">
                          <b>{p.pymeNombre}</b>
                          {p.premium && <Badge tono="teal" icon="crown">Premium</Badge>}
                          <Badge tono={tonoEstado(p.estado)} dot>{p.estado}</Badge>
                          {p.adjudicada && <Badge tono="violet" icon="award">Adjudicada</Badge>}
                        </div>
                        <small>{cat.rubro(p.pymeRubroId)} · {p.pymeTamanoId ? `Empresa ${cat.tamano(p.pymeTamanoId).toLowerCase()} · ` : ''}postuló {hace(p.fecha)}</small>
                        {p.mensaje && <p>“{p.mensaje}”</p>}
                      </div>
                      {esDueno && (
                        <div className="applicant-actions">
                          {p.estado === 'Pendiente' && l.estado === 'Abierta' && <>
                            <Button size="sm" variant="success" icon="check" onClick={() => decidir(p, 'Aprobada')}>Aprobar</Button>
                            <Button size="sm" variant="outline" icon="x" onClick={() => decidir(p, 'Rechazada')}>Rechazar</Button>
                          </>}
                          {p.estado === 'Aprobada' && l.estado === 'Abierta' && <Button size="sm" icon="award" onClick={() => setConfirmar({ tipo: 'adjudicar', p })}>Adjudicar</Button>}
                          {p.conversacionId && <Button size="sm" variant="teal" icon="chat" onClick={() => navigate(`/app/chat/${p.conversacionId}`)}>Chat</Button>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="stack">
          {rol === 'PYME' && (
            <Card className="apply-card">
              {miPost ? (
                <>
                  <CardHeader icon="send" title="Tu postulación" />
                  <div className="apply-state">
                    <Badge tono={tonoEstado(miPost.estado)} dot>{miPost.estado}</Badge>
                    {miPost.adjudicada && <Badge tono="violet" icon="award">¡Adjudicada!</Badge>}
                  </div>
                  <p className="muted-p">Enviada el {fechaCorta(miPost.fecha)}.</p>
                  {miPost.mensaje && <blockquote>“{miPost.mensaje}”</blockquote>}
                  {miPost.estado === 'Pendiente' && <p className="muted-p"><Icon name="clock" size={14} /> Esperando la revisión del Licitador.</p>}
                  {miPost.conversacionId && <Button block icon="chat" variant="teal" onClick={() => navigate(`/app/chat/${miPost.conversacionId}`)}>Abrir chat con el Licitador</Button>}
                </>
              ) : abierta ? (
                <>
                  <CardHeader icon="send" title="Postular a esta licitación" />
                  {sub.data && (
                    <div className="quota">
                      <div><b>{restantes}</b> de {sub.data.plan.postulacionesMes} postulaciones disponibles este mes</div>
                      <Progress valor={sub.data.postulacionesUsadas} max={sub.data.plan.postulacionesMes} tono={restantes === 0 ? 'red' : 'accent'} />
                    </div>
                  )}
                  <Field label="Mensaje para el Licitador" hint="Cuéntale por qué eres la mejor opción."><Textarea rows={5} value={mensaje} onChange={(e) => setMensaje(e.target.value)} placeholder="Experiencia similar, plazos, diferenciadores…" /></Field>
                  <Button block size="lg" icon="send" loading={enviando} onClick={postular}>Enviar postulación</Button>
                </>
              ) : (
                <EmptyState icon="lock" titulo="Licitación no disponible" texto="Esta licitación ya no recibe postulaciones." />
              )}
            </Card>
          )}
          {((esDueno || rol === 'ADMIN') && l.estado === 'Abierta' || esDueno) && (
            <Card>
              <CardHeader icon="settings" title="Gestión" />
              <div className="gestion">
                {l.estado === 'Abierta' && <Button block variant="outline" icon="lock" onClick={() => setConfirmar({ tipo: 'cerrar' })}>{rol === 'ADMIN' ? 'Cerrar licitación (moderación)' : 'Cerrar licitación'}</Button>}
                {esDueno && (l.postulantes === 0
                  ? <Button block variant="danger" icon="trash" onClick={() => setConfirmar({ tipo: 'eliminar' })}>Eliminar licitación</Button>
                  : <p className="muted-p"><Icon name="info" size={14} /> No se puede eliminar porque ya tiene postulaciones. {l.estado === 'Abierta' && 'Si ya no la necesitas, ciérrala.'}</p>)}
              </div>
            </Card>
          )}
          <Card>
            <CardHeader icon="building" title="Publicada por" />
            <div className="who"><Avatar nombre={l.licitadorNombre} size={46} /><div><b>{l.licitadorNombre}</b><small>Publicada el {fechaCorta(l.createdAt)}</small></div></div>
            {l.presupuestoMax && <p className="muted-p">Presupuesto máximo referencial: <b>{clp(l.presupuestoMax)}</b></p>}
          </Card>
        </div>
      </div>

      <Modal abierto={limite} onClose={() => setLimite(false)} titulo="Alcanzaste tu límite de postulaciones" ancho={500}
        pie={sub.data?.plan.nombre === 'Premium'
          ? <Button onClick={() => setLimite(false)}>Entendido</Button>
          : <><Button variant="ghost" onClick={() => setLimite(false)}>Ahora no</Button><Button icon="crown" onClick={() => navigate('/app/suscripcion')}>Pasar a Premium</Button></>}>
        <div className="limite-pop">
          <span className="limite-ic"><Icon name="crown" size={28} /></span>
          {sub.data?.plan.nombre === 'Premium' ? (
            <p>Ya usaste las <b>{sub.data.plan.postulacionesMes} postulaciones</b> de tu plan Premium este mes. Podrás volver a postular a partir del próximo mes.</p>
          ) : (
            <>
              <p>Ya usaste las <b>{sub.data?.plan.postulacionesMes ?? 3} postulaciones</b> de tu plan Estándar este mes. Pasa a <b>Premium</b> y sigue postulando hoy mismo:</p>
              <ul>
                {(premium?.beneficios ?? ['7 postulaciones al mes', 'LicitAsist: asistente con inteligencia artificial', 'Prioridad de visibilidad ante los Licitadores']).map((b) => <li key={b}><Icon name="checkcircle" size={16} />{b}</li>)}
              </ul>
              {premium && <p className="limite-precio"><b>{clp(premium.precioMensual)}</b> al mes</p>}
              <p className="limite-nota">Tu mensaje queda guardado aquí para cuando puedas enviarlo.</p>
            </>
          )}
        </div>
      </Modal>

      <Modal abierto={!!confirmar} onClose={() => setConfirmar(null)} titulo={confirmar?.tipo === 'adjudicar' ? 'Adjudicar licitación' : confirmar?.tipo === 'eliminar' ? 'Eliminar licitación' : 'Cerrar licitación'}
        pie={<><Button variant="ghost" onClick={() => setConfirmar(null)}>Cancelar</Button>
          <Button variant={confirmar?.tipo === 'eliminar' ? 'danger' : undefined} icon={confirmar?.tipo === 'adjudicar' ? 'award' : confirmar?.tipo === 'eliminar' ? 'trash' : 'lock'} onClick={ejecutarConfirmacion}>
            {confirmar?.tipo === 'adjudicar' ? 'Sí, adjudicar' : confirmar?.tipo === 'eliminar' ? 'Sí, eliminar' : 'Sí, cerrar'}</Button></>}>
        {confirmar?.tipo === 'adjudicar'
          ? <p>Vas a adjudicar <b>{l.titulo}</b> a <b>{confirmar.p?.pymeNombre}</b>. Las demás postulaciones pendientes se rechazarán y se abrirá un chat privado con la Pyme.</p>
          : confirmar?.tipo === 'eliminar'
            ? <p>Vas a eliminar <b>{l.titulo}</b>. Desaparecerá de LicitaWatch y no se puede recuperar. Esta acción no se puede deshacer.</p>
            : <p>La licitación <b>{l.titulo}</b> dejará de recibir postulaciones. Esta acción no se puede deshacer.</p>}
      </Modal>
    </div>
  )
}
