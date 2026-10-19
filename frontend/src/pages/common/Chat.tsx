import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import type { Mensaje } from '../../api/types'
import { Avatar, Button, Card, Cargando, EmptyState, Modal, PageHeader, useAsync, useToast } from '../../components/ui/ui'
import { useAuth, useCatalogos } from '../../context/AuthContext'
import { Icon } from '../../lib/icons'
import { Link, navigate } from '../../lib/router'
import { fechaCorta, hace } from '../../lib/format'

export function Chat({ id }: { id?: number }) {
  const { sesion } = useAuth()
  const cat = useCatalogos()
  const toast = useToast()
  const convs = useAsync(() => api.conversaciones(), [])
  const [msgs, setMsgs] = useState<Mensaje[]>([])
  const [cargandoMsgs, setCargandoMsgs] = useState(false)
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [eliminar, setEliminar] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const fin = useRef<HTMLDivElement>(null)
  const yo = sesion!.usuario.id
  const actual = convs.data?.find((c) => c.id === id)

  // Sin conversación seleccionada, abre la más reciente (en pantallas anchas).
  useEffect(() => {
    if (!id && convs.data && convs.data.length > 0 && window.innerWidth > 900) navigate(`/app/chat/${convs.data[0].id}`, true)
  }, [id, convs.data])

  useEffect(() => {
    if (!id) { setMsgs([]); return }
    let vivo = true
    setCargandoMsgs(true)
    const cargar = () => api.mensajes(id).then((m) => { if (vivo) setMsgs(m) }).catch(() => undefined)
    cargar().finally(() => vivo && setCargandoMsgs(false))
    const t = setInterval(() => { cargar(); convs.recargar() }, 5000) // polling (MVP del documento de arquitectura)
    return () => { vivo = false; clearInterval(t) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [msgs.length])

  const enviar = async () => {
    if (!id || !texto.trim()) return
    setEnviando(true)
    try {
      const m = await api.enviarMensaje(id, texto)
      setMsgs((x) => [...x, m]); setTexto(''); convs.recargar()
    } catch (e) { toast.error((e as Error).message) } finally { setEnviando(false) }
  }

  const confirmarEliminar = async () => {
    if (!id) return
    setEliminando(true)
    try {
      await api.eliminarConversacion(id)
      toast.ok('Conversación eliminada.')
      setEliminar(false); setTexto('')
      // Se quita de la lista al tiro (sin esperar la recarga) para que no se vuelva a abrir sola.
      convs.setData((cs) => (cs ?? []).filter((c) => c.id !== id))
      navigate('/app/chat', true)
      convs.recargar()
    } catch (e) { toast.error((e as Error).message) } finally { setEliminando(false) }
  }

  // Solo en la carga inicial: el polling recarga cada 5 s y, si aquí se mostrara <Cargando />, se desmontaría
  // el chat completo (el campo de texto pierde el foco y se corta la escritura).
  if (convs.loading && !convs.data) return <Cargando />
  if (!convs.data || convs.data.length === 0) {
    return (
      <div className="stack">
        <PageHeader title="Chat" subtitle="Conversaciones privadas entre Licitador y Pyme adjudicada." />
        <Card><EmptyState icon="chat" titulo="Aún no tienes conversaciones" texto={sesion!.usuario.rol === 'LICITADOR' ? 'El chat se abre automáticamente cuando adjudicas una licitación a una Pyme.' : 'El chat se abre automáticamente cuando un Licitador te adjudica una licitación.'} /></Card>
      </div>
    )
  }

  return (
    <div className="stack">
      <PageHeader title="Chat" subtitle="Conversaciones privadas entre Licitador y Pyme adjudicada." />
      <div className={`chat ${id ? 'has-thread' : ''}`}>
        <aside className="chat-list">
          {convs.data.map((c) => (
            <Link key={c.id} to={`/app/chat/${c.id}`} className={`chat-item ${c.id === id ? 'on' : ''}`}>
              <Avatar nombre={c.interlocutor} size={42} />
              <div className="chat-item-body">
                <div className="chat-item-top"><b>{c.interlocutor}</b>{c.ultimoAt && <small>{hace(c.ultimoAt)}</small>}</div>
                {c.interlocutorContacto && <small className="chat-item-contacto"><Icon name="user" size={12} /> {c.interlocutorContacto}</small>}
                <small className="chat-item-tender">{c.licitacionTitulo}</small>
                <span className="chat-item-last">{c.ultimoMensaje}</span>
              </div>
              {c.noLeidos > 0 && <em>{c.noLeidos}</em>}
            </Link>
          ))}
        </aside>
        <section className="chat-thread">
          {!id || !actual ? <EmptyState icon="chat" titulo="Selecciona una conversación" /> : (
            <>
              <header className="chat-head">
                <button className="icon-btn chat-back" onClick={() => navigate('/app/chat')} aria-label="Volver"><Icon name="arrowleft" size={20} /></button>
                <Avatar nombre={actual.interlocutor} size={42} />
                <div>
                  <b>{actual.interlocutor}</b>
                  <small className="chat-head-datos">
                    {actual.interlocutorRut && <span>RUT {actual.interlocutorRut}</span>}
                    {actual.interlocutorRubroId && <span><Icon name="tag" size={12} /> {cat.rubro(actual.interlocutorRubroId)}</span>}
                    {actual.interlocutorContacto && <span><Icon name="user" size={12} /> Contacto: <b>{actual.interlocutorContacto}</b></span>}
                  </small>
                  <small>{actual.licitacionTitulo}</small>
                </div>
                <Link to={`/app/licitacion/${actual.licitacionId}`} className="btn btn-soft btn-sm"><span>Ver licitación</span></Link>
                <button className="icon-btn chat-del" onClick={() => setEliminar(true)} aria-label="Eliminar conversación" title="Eliminar conversación"><Icon name="trash" size={18} /></button>
              </header>
              <div className="chat-msgs">
                {cargandoMsgs && msgs.length === 0 ? <Cargando /> : msgs.map((m, i) => {
                  const mio = m.emisorId === yo
                  const nuevoDia = i === 0 || fechaCorta(msgs[i - 1].enviadoAt) !== fechaCorta(m.enviadoAt)
                  return (
                    <div key={m.id}>
                      {nuevoDia && <div className="chat-day">{fechaCorta(m.enviadoAt)}</div>}
                      <div className={`bubble ${mio ? 'me' : 'other'}`}>
                        <p>{m.contenido}</p>
                        <small>{new Date(m.enviadoAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}{mio && <Icon name={m.leido ? 'checkcircle' : 'check'} size={12} />}</small>
                      </div>
                    </div>
                  )
                })}
                <div ref={fin} />
              </div>
              <footer className="chat-input">
                <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe un mensaje…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }} />
                <Button icon="send" loading={enviando} onClick={enviar} disabled={!texto.trim()}>Enviar</Button>
              </footer>
            </>
          )}
        </section>
      </div>

      <Modal abierto={eliminar} onClose={() => setEliminar(false)} titulo="Eliminar conversación" ancho={480}
        pie={<><Button variant="ghost" onClick={() => setEliminar(false)}>Cancelar</Button><Button variant="danger" icon="trash" loading={eliminando} onClick={confirmarEliminar}>Sí, eliminar</Button></>}>
        <p>Se eliminará de tu lista junto con su historial de mensajes. <b>{actual?.interlocutor}</b> conservará la conversación.</p>
        <p className="muted-p">Si te vuelven a escribir, la conversación reaparecerá solo con los mensajes nuevos.</p>
      </Modal>
    </div>
  )
}
