import { useState } from 'react'
import { api } from '../../api'
import type { MetodoPago, Plan } from '../../api/types'
import { Badge, Button, Card, CardHeader, Cargando, Field, Input, Modal, PageHeader, Progress, Select, tonoEstado, useAsync, useToast } from '../../components/ui/ui'
import { Icon } from '../../lib/icons'
import { clp, fechaCorta } from '../../lib/format'

export function Subscription() {
  const toast = useToast()
  const planes = useAsync(() => api.planes(), [])
  const sub = useAsync(() => api.miSuscripcion(), [])
  const pagos = useAsync(() => api.misPagos(), [])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [metodo, setMetodo] = useState<MetodoPago>('Crédito')
  const [tarjeta, setTarjeta] = useState('4051 8856 0044 6623')
  const [rechazo, setRechazo] = useState(false)
  const [paso, setPaso] = useState<'form' | 'procesando' | 'ok' | 'error'>('form')
  const [cancelar, setCancelar] = useState(false)

  if (planes.loading || sub.loading) return <Cargando />
  const actual = sub.data!
  const premium = actual.plan.nombre === 'Premium' && actual.estado === 'Activa'

  const abrir = (p: Plan) => { setPlan(p); setPaso('form'); setRechazo(false) }
  const pagar = async () => {
    if (!plan) return
    setPaso('procesando')
    try {
      const r = await api.pagar(plan.id, metodo, rechazo)
      await new Promise((x) => setTimeout(x, 1200))
      setPaso(r.venta.estado === 'Aprobado' ? 'ok' : 'error')
      sub.recargar(); pagos.recargar()
    } catch (e) { setPaso('error'); toast.error((e as Error).message) }
  }
  const confirmarCancelar = async () => {
    try { await api.cancelarSuscripcion(); toast.ok('Suscripción cancelada. Vuelves al plan Estándar.'); sub.recargar() } catch (e) { toast.error((e as Error).message) }
    setCancelar(false)
  }

  return (
    <div className="stack">
      <PageHeader title="Mi suscripción" subtitle="Los Licitadores son gratis. Tú eliges cuánto quieres postular." />
      <Card className="sub-current">
        <div className="sub-top">
          <div className="sub-badge"><Icon name={premium ? 'crown' : 'layers'} size={26} /></div>
          <div>
            <small>Plan actual</small>
            <h2>{actual.plan.nombre} {premium && <Badge tono="teal" icon="sparkles">Activo</Badge>}</h2>
            <p className="muted-p">{premium ? `Vigente hasta el ${fechaCorta(actual.fechaFin)}` : 'Gratis · sin vencimiento'}</p>
          </div>
          {premium && <Button variant="ghost" onClick={() => setCancelar(true)}>Cancelar suscripción</Button>}
        </div>
        <div className="quota">
          <div><b>{actual.postulacionesUsadas}</b> de {actual.plan.postulacionesMes} postulaciones usadas este mes</div>
          <Progress valor={actual.postulacionesUsadas} max={actual.plan.postulacionesMes} tono={actual.postulacionesUsadas >= actual.plan.postulacionesMes ? 'red' : 'accent'} />
        </div>
      </Card>

      <div className="plans">
        {planes.data!.map((p) => {
          const esActual = p.nombre === actual.plan.nombre && actual.estado === 'Activa'
          return (
            <Card key={p.id} className={`plan ${p.nombre === 'Premium' ? 'plan-pro' : ''}`}>
              {p.nombre === 'Premium' && <span className="plan-tag">Recomendado</span>}
              <h3>{p.nombre}</h3>
              <p className="muted-p">{p.descripcion}</p>
              <div className="plan-price"><b>{p.precioMensual === 0 ? 'Gratis' : clp(p.precioMensual)}</b>{p.precioMensual > 0 && <span>/mes</span>}</div>
              <ul>{p.beneficios.map((b) => <li key={b}><Icon name="checkcircle" size={18} />{b}</li>)}</ul>
              {esActual ? <Button block variant="soft" disabled>Tu plan actual</Button>
                : p.precioMensual > 0 ? <Button block size="lg" variant="teal" icon="crown" onClick={() => abrir(p)}>Pasar a Premium</Button> : null}
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader icon="card" title="Historial de pagos" />
        {pagos.loading ? <Cargando /> : !pagos.data?.length ? <p className="muted-p">Aún no tienes pagos.</p> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Fecha</th><th>Plan</th><th>Método</th><th>Transacción</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>{pagos.data.map((v) => (
              <tr key={v.id}><td>{fechaCorta(v.fecha)}</td><td>{v.plan}</td><td>{v.metodo}</td><td><code>{v.idTransaccion}</code></td><td>{clp(v.monto)}</td><td><Badge tono={tonoEstado(v.estado)} dot>{v.estado}</Badge></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>

      <Modal abierto={!!plan} onClose={() => paso !== 'procesando' && setPlan(null)} titulo="Pagar suscripción Premium" ancho={480}
        pie={paso === 'form' ? <><Button variant="ghost" onClick={() => setPlan(null)}>Cancelar</Button><Button icon="lock" onClick={pagar}>Pagar {plan && clp(plan.precioMensual)}</Button></>
          : paso === 'ok' ? <Button onClick={() => setPlan(null)}>Listo</Button> : paso === 'error' ? <Button onClick={() => setPaso('form')}>Reintentar</Button> : undefined}>
        {paso === 'form' && plan && (
          <div className="stack-sm">
            <div className="webpay"><b>Webpay</b><span>Simulación Transbank · ambiente de integración</span></div>
            <Field label="Método"><Select value={metodo} onChange={(e) => setMetodo(e.target.value as MetodoPago)}><option>Crédito</option><option>Débito</option></Select></Field>
            <Field label="Número de tarjeta" hint="Tarjeta de prueba de Transbank"><Input icon="card" value={tarjeta} onChange={(e) => setTarjeta(e.target.value)} /></Field>
            <label className="check"><input type="checkbox" checked={rechazo} onChange={(e) => setRechazo(e.target.checked)} /> Simular pago rechazado</label>
          </div>
        )}
        {paso === 'procesando' && <Cargando texto="Conectando con Webpay…" />}
        {paso === 'ok' && <div className="pay-result ok"><Icon name="checkcircle" size={56} /><h3>¡Pago aprobado!</h3><p>Ya eres Premium: más postulaciones, prioridad y LicitAsist.</p></div>}
        {paso === 'error' && <div className="pay-result bad"><Icon name="xcircle" size={56} /><h3>Pago rechazado</h3><p>No se realizó ningún cobro. Revisa tu tarjeta e inténtalo de nuevo.</p></div>}
      </Modal>
      <Modal abierto={cancelar} onClose={() => setCancelar(false)} titulo="Cancelar suscripción" pie={<><Button variant="ghost" onClick={() => setCancelar(false)}>Mantener Premium</Button><Button variant="danger" onClick={confirmarCancelar}>Sí, cancelar</Button></>}>
        <p>Volverás al plan Estándar (3 postulaciones al mes) y perderás LicitAsist y la prioridad en postulaciones.</p>
      </Modal>
    </div>
  )
}
