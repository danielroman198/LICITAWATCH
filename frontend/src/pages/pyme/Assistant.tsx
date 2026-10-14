import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import type { MensajeAsistente } from '../../api/types'
import { Button, Card, Cargando, EmptyState, PageHeader, useAsync } from '../../components/ui/ui'
import { Icon } from '../../lib/icons'
import { Link, navigate } from '../../lib/router'
import { rangoPresupuesto } from '../../lib/format'

const SUGERENCIAS = ['Licitaciones de tecnología en la Región Metropolitana', 'Muéstrame licitaciones con presupuesto bajo $5.000.000', '¿Qué licitaciones cierran pronto?']

export function Assistant() {
  const sub = useAsync(() => api.miSuscripcion(), [])
  const [msgs, setMsgs] = useState<MensajeAsistente[]>([{ rol: 'asistente', texto: '¡Hola! Soy LicitAsist. Cuéntame qué tipo de licitaciones buscas (rubro, región o presupuesto) y las encuentro por ti.' }])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const fin = useRef<HTMLDivElement>(null)
  useEffect(() => { fin.current?.scrollIntoView({ block: 'end' }) }, [msgs.length, pensando])

  if (sub.loading) return <Cargando />
  if (sub.data?.plan.nombre !== 'Premium' || sub.data.estado !== 'Activa') {
    return (
      <div className="stack">
        <PageHeader title="LicitAsist" subtitle="Tu asistente de IA para encontrar licitaciones." />
        <Card><EmptyState icon="lock" titulo="LicitAsist es una función Premium" texto="Pregúntale en lenguaje natural y recibe las licitaciones que mejor calzan con tu empresa."
          accion={<Button variant="teal" icon="crown" onClick={() => navigate('/app/suscripcion')}>Ver plan Premium</Button>} /></Card>
      </div>
    )
  }
  const enviar = async (t = texto) => {
    if (!t.trim() || pensando) return
    setMsgs((m) => [...m, { rol: 'usuario', texto: t }]); setTexto(''); setPensando(true)
    try { const r = await api.preguntarAsistente(t); setMsgs((m) => [...m, r]) }
    catch (e) { setMsgs((m) => [...m, { rol: 'asistente', texto: (e as Error).message }]) }
    finally { setPensando(false) }
  }
  return (
    <div className="stack">
      <PageHeader title="LicitAsist" subtitle="Asistente de IA · busca licitaciones conversando." />
      <Card pad={false} className="assistant">
        <div className="chat-msgs">
          {msgs.map((m, i) => (
            <div key={i} className={`bubble ${m.rol === 'usuario' ? 'me' : 'other'}`}>
              {m.rol === 'asistente' && <span className="bot-ic"><Icon name="sparkles" size={16} /></span>}
              <p>{m.texto}</p>
              {m.licitaciones && m.licitaciones.length > 0 && (
                <div className="bot-results">{m.licitaciones.map((l) => (
                  <Link key={l.id} to={`/app/licitacion/${l.id}`} className="bot-result"><b>{l.titulo}</b><small>{l.licitadorNombre} · {rangoPresupuesto(l.presupuestoMin, l.presupuestoMax)}</small></Link>
                ))}</div>
              )}
            </div>
          ))}
          {pensando && <div className="bubble other"><span className="typing"><i /><i /><i /></span></div>}
          <div ref={fin} />
        </div>
        <div className="chips">{SUGERENCIAS.map((s) => <button key={s} className="chip" onClick={() => enviar(s)}>{s}</button>)}</div>
        <footer className="chat-input">
          <input className="input" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe tu consulta…" onKeyDown={(e) => e.key === 'Enter' && enviar()} />
          <Button icon="send" onClick={() => enviar()} disabled={!texto.trim() || pensando}>Enviar</Button>
        </footer>
      </Card>
    </div>
  )
}
