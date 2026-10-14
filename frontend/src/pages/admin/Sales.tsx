import { api } from '../../api'
import { Badge, Card, CardHeader, Cargando, EmptyState, PageHeader, StatCard, tonoEstado, useAsync } from '../../components/ui/ui'
import { AreaChart, Donut } from '../../lib/charts'
import { clp, fechaHora } from '../../lib/format'

export function AdminSales() {
  const est = useAsync(() => api.estadisticasAdmin(), [])
  const ventas = useAsync(() => api.ventasAdmin(), [])
  if (est.loading || ventas.loading) return <Cargando />
  const e = est.data!
  const pymes = e.pymes || 1
  return (
    <div className="stack">
      <PageHeader title="Ventas y suscripciones" subtitle="Pymes registradas, suscripciones pagadas y ganancias." />
      <div className="stats stats-4">
        <StatCard icon="users" label="Pymes registradas" valor={e.pymes} />
        <StatCard icon="crown" label="Pymes Premium (pagan)" valor={e.pymesPremium} tono="violet" delta={`${Math.round((e.pymesPremium / pymes) * 100)}% de conversión`} />
        <StatCard icon="wallet" label="Ingresos del mes" valor={clp(e.ingresosMes)} tono="green" />
        <StatCard icon="dollar" label="Ingresos totales" valor={clp(e.ingresosTotal)} tono="amber" />
      </div>
      <div className="grid-2-eq">
        <Card><CardHeader icon="trending" title="Ingresos por mes" /><AreaChart datos={e.ingresosPorMes} formato={clp} /></Card>
        <Card><CardHeader icon="layers" title="Pymes por plan" />
          <Donut segmentos={[{ etiqueta: 'Premium', valor: e.pymesPremium, color: 'var(--violet)' }, { etiqueta: 'Estándar', valor: e.pymesEstandar, color: 'var(--blue)' }]} centro={`${e.pymes}`} subtitulo="Pymes" />
        </Card>
      </div>
      <Card pad={false}>
        <div className="pad"><CardHeader icon="card" title="Transacciones" /></div>
        {!ventas.data?.length ? <EmptyState icon="card" titulo="Sin transacciones" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Fecha</th><th>Pyme</th><th>Plan</th><th>Método</th><th>Transacción</th><th>Monto</th><th>Estado</th></tr></thead>
            <tbody>{ventas.data.map((v) => (
              <tr key={v.id}><td>{fechaHora(v.fecha)}</td><td><b>{v.usuarioNombre}</b></td><td>{v.plan}</td><td>{v.metodo}</td><td><code>{v.idTransaccion}</code></td><td>{clp(v.monto)}</td><td><Badge tono={tonoEstado(v.estado)} dot>{v.estado}</Badge></td></tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}
