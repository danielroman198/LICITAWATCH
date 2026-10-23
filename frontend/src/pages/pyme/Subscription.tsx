import { useEffect, useState } from 'react'
import { api } from '../../api'
import type { Plan } from '../../api/types'
import { Badge, Button, Card, CardHeader, Cargando, Modal, PageHeader, Progress, tonoEstado, useAsync, useToast } from '../../components/ui/ui'
import { Icon } from '../../lib/icons'
import { clp, fechaCorta } from '../../lib/format'

// Tarjetas del ambiente de integración de Transbank (transbankdevelopers.cl → Tarjetas de prueba). Autenticación del banco: RUT 11.111.111-1, clave 123.
const TARJETAS_PRUEBA = [
  { tipo: 'VISA (crédito)', numero: '4051 8856 0044 6623', cvv: '123', ok: true },
  { tipo: 'AMEX (crédito)', numero: '3700 0000 0002 032', cvv: '1234', ok: true },
  { tipo: 'MASTERCARD (crédito)', numero: '5186 0595 5959 0568', cvv: '123', ok: false },
  { tipo: 'Redcompra (débito)', numero: '4051 8842 3993 7763', cvv: '—', ok: true },
  { tipo: 'Redcompra (débito)', numero: '4511 3466 6003 7060', cvv: '—', ok: true },
  { tipo: 'Redcompra (débito)', numero: '5186 0085 4123 3829', cvv: '—', ok: false },
]

/** Resultado con el que Webpay devuelve al usuario: el BFF lo deja en la URL (/app/suscripcion?pago=…). */
type RetornoWebpay = { pago: string; ordenCompra?: string; monto?: string; metodo?: string; plan?: string; codigoAutorizacion?: string; ultimos4?: string; cuotas?: string; mensaje?: string; orden?: string }
function leerRetorno(): RetornoWebpay | null {
  const q = new URLSearchParams(window.location.search)
  return q.get('pago') ? (Object.fromEntries(q) as RetornoWebpay) : null
}

/** Envía el navegador al formulario de pago de Transbank (POST con token_ws, como indica Webpay Plus). */
function irAWebpay(url: string, token: string) {
  if (!token) { window.location.assign(url); return }   // modo simulado
  const f = document.createElement('form')
  f.method = 'POST'; f.action = url
  const i = document.createElement('input'); i.type = 'hidden'; i.name = 'token_ws'; i.value = token
  f.appendChild(i); document.body.appendChild(f); f.submit()
}

export function Subscription() {
  const toast = useToast()
  const planes = useAsync(() => api.planes(), [])
  const sub = useAsync(() => api.miSuscripcion(), [])
  const pagos = useAsync(() => api.misPagos(), [])
  const [plan, setPlan] = useState<Plan | null>(null)
  const [redirigiendo, setRedirigiendo] = useState(false)
  const [retorno, setRetorno] = useState<RetornoWebpay | null>(leerRetorno)
  const [cancelar, setCancelar] = useState(false)

  // Al volver de Webpay se muestra el resultado una sola vez: se limpia la URL para que recargar no lo repita.
  useEffect(() => { if (retorno) window.history.replaceState(null, '', '/app/suscripcion') }, []) // eslint-disable-line

  if (planes.loading || sub.loading) return <Cargando />
  const actual = sub.data!
  const premium = actual.plan.nombre === 'Premium' && actual.estado === 'Activa'

  const abrir = (p: Plan) => { setPlan(p); setRedirigiendo(false) }
  const pagar = async () => {
    if (!plan) return
    setRedirigiendo(true)
    try {
      const t = await api.iniciarPagoWebpay(plan.id)
      irAWebpay(t.url, t.token)   // el navegador sale de LicitaWatch; Transbank lo devuelve con el resultado
    } catch (e) { setRedirigiendo(false); toast.error((e as Error).message) }
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

      <Modal abierto={!!plan} onClose={() => !redirigiendo && setPlan(null)} titulo="Pagar suscripción Premium" ancho={580}
        pie={<><Button variant="ghost" onClick={() => setPlan(null)} disabled={redirigiendo}>Cancelar</Button><Button icon="lock" loading={redirigiendo} onClick={pagar}>Ir a pagar {plan && clp(plan.precioMensual)}</Button></>}>
        {plan && (
          <div className="stack-sm">
            <div className="webpay"><b>Webpay Plus</b><span>Transbank · ambiente de integración (pagos de prueba, sin cobro real)</span></div>
            <div className="pay-resumen"><span>Plan {plan.nombre} · 30 días</span><b>{clp(plan.precioMensual)}</b></div>
            <p className="muted-p">Te llevaremos al formulario seguro de Webpay para ingresar tu tarjeta. LicitaWatch nunca ve ni guarda los datos de tu tarjeta. Al terminar volverás aquí con el comprobante.</p>
            <details className="tarjetas-prueba">
              <summary><Icon name="card" size={16} /> Tarjetas de prueba de Transbank</summary>
              <table className="table"><thead><tr><th>Tarjeta</th><th>Número</th><th>CVV</th><th>Resultado</th></tr></thead>
                <tbody>{TARJETAS_PRUEBA.map((t) => <tr key={t.numero}><td>{t.tipo}</td><td><code>{t.numero}</code></td><td>{t.cvv}</td><td><Badge tono={t.ok ? 'green' : 'red'} dot>{t.ok ? 'Aprobada' : 'Rechazada'}</Badge></td></tr>)}</tbody>
              </table>
              <p className="muted-p">Fecha de expiración: cualquiera. Si el banco pide autenticarte: RUT <b>11.111.111-1</b>, clave <b>123</b>.</p>
            </details>
          </div>
        )}
      </Modal>
      <Modal abierto={!!retorno} onClose={() => setRetorno(null)} titulo="Resultado del pago" ancho={460} pie={<Button onClick={() => setRetorno(null)}>{retorno?.pago === 'aprobado' ? 'Listo' : 'Entendido'}</Button>}>
        {retorno && <ResultadoWebpay r={retorno} />}
      </Modal>
      <Modal abierto={cancelar} onClose={() => setCancelar(false)} titulo="Cancelar suscripción" pie={<><Button variant="ghost" onClick={() => setCancelar(false)}>Mantener Premium</Button><Button variant="danger" onClick={confirmarCancelar}>Sí, cancelar</Button></>}>
        <p>Volverás al plan Estándar (3 postulaciones al mes) y perderás LicitAsist y la prioridad en postulaciones.</p>
      </Modal>
    </div>
  )
}

function ResultadoWebpay({ r }: { r: RetornoWebpay }) {
  const fila = (k: string, v?: string) => v ? <div><span>{k}</span><b>{v}</b></div> : null
  const detalle = (
    <div className="pay-detalle">
      {fila('Orden de compra', r.ordenCompra ?? r.orden)}
      {fila('Plan', r.plan)}
      {fila('Monto', r.monto ? clp(Number(r.monto)) : undefined)}
      {fila('Tarjeta', r.ultimos4 ? `${r.metodo ?? ''} terminada en ${r.ultimos4}` : r.metodo)}
      {fila('Cuotas', r.cuotas && Number(r.cuotas) > 0 ? r.cuotas : undefined)}
      {fila('Código de autorización', r.codigoAutorizacion)}
    </div>
  )
  if (r.pago === 'aprobado') return <div className="pay-result ok"><Icon name="checkcircle" size={56} /><h3>¡Pago aprobado!</h3><p>Ya eres Premium: más postulaciones, prioridad y LicitAsist.</p>{detalle}</div>
  if (r.pago === 'rechazado') return <div className="pay-result bad"><Icon name="xcircle" size={56} /><h3>Pago rechazado</h3><p>Transbank rechazó la transacción y no se realizó ningún cobro. Revisa los datos de tu tarjeta o prueba con otra.</p>{detalle}</div>
  if (r.pago === 'anulado') return <div className="pay-result bad"><Icon name="xcircle" size={56} /><h3>Pago anulado</h3><p>Cancelaste el pago en Webpay. No se realizó ningún cobro.</p>{detalle}</div>
  if (r.pago === 'expirado') return <div className="pay-result bad"><Icon name="xcircle" size={56} /><h3>Se acabó el tiempo</h3><p>El formulario de Webpay expiró antes de completar el pago. No se realizó ningún cobro.</p>{detalle}</div>
  return <div className="pay-result bad"><Icon name="xcircle" size={56} /><h3>No pudimos confirmar el pago</h3><p>{r.mensaje || 'Inténtalo nuevamente en unos minutos.'}</p></div>
}
