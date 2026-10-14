import { api } from '../../api'
import { AreaChart, BarChart, Donut, HBars } from '../../lib/charts'
import { Badge, Card, CardHeader, Cargando, PageHeader, StatCard, tonoEstado, useAsync } from '../../components/ui/ui'
import { clp, compacto, fechaCorta } from '../../lib/format'
import { Link } from '../../lib/router'

export function AdminDashboard() {
  const { data: e, loading } = useAsync(() => api.estadisticasAdmin(), [])
  const ventas = useAsync(() => api.ventasAdmin(), [])
  if (loading || !e) return <Cargando />
  return (
    <div className="stack">
      <PageHeader title="Panel de administración" subtitle="Métricas generales de la plataforma LicitaWatch." />
      <div className="stats stats-6">
        <StatCard icon="users" label="Usuarios registrados" valor={e.usuariosTotal} delta={`${e.licitadores} licitadores · ${e.pymes} pymes`} />
        <StatCard icon="file" label="Licitaciones" valor={e.licitacionesTotal} tono="violet" delta={`${e.licitacionesAbiertas} abiertas · ${e.licitacionesAdjudicadas} adjudicadas`} />
        <StatCard icon="crown" label="Suscripciones Premium" valor={e.suscripcionesActivas} tono="green" delta={`${e.pymesEstandar} pymes en Estándar`} />
        <StatCard icon="wallet" label="Ingresos del mes" valor={clp(e.ingresosMes)} tono="amber" />
        <StatCard icon="dollar" label="Ingresos acumulados" valor={clp(e.ingresosTotal)} tono="green" />
        <StatCard icon="lock" label="Cuentas bloqueadas" valor={e.bloqueados} tono="red" />
      </div>
      <div className="grid-2-eq">
        <Card>
          <CardHeader icon="wallet" title="Ingresos por suscripciones" subtitle="Ventas aprobadas, últimos 6 meses" />
          <BarChart datos={e.ingresosPorMes} formato={(n) => compacto(n)} />
        </Card>
        <Card>
          <CardHeader icon="users" title="Registros de usuarios" subtitle="Nuevas cuentas por mes" />
          <AreaChart datos={e.registrosPorMes} color="var(--violet)" />
        </Card>
      </div>
      <div className="grid-3">
        <Card>
          <CardHeader icon="users" title="Tipo de cuenta" />
          <Donut centro={String(e.usuariosTotal)} subtitulo="usuarios" segmentos={[
            { etiqueta: 'Licitadores', valor: e.licitadores, color: 'var(--blue)' },
            { etiqueta: 'Pymes', valor: e.pymes, color: 'var(--teal)' },
          ]} />
        </Card>
        <Card>
          <CardHeader icon="crown" title="Planes de las Pymes" />
          <Donut centro={`${e.pymes ? Math.round((e.pymesPremium / e.pymes) * 100) : 0}%`} subtitulo="Premium" segmentos={[
            { etiqueta: 'Premium', valor: e.pymesPremium, color: 'var(--teal)' },
            { etiqueta: 'Estándar', valor: e.pymesEstandar, color: '#C3CCDD' },
          ]} />
        </Card>
        <Card>
          <CardHeader icon="chart" title="Licitaciones por rubro" />
          <HBars items={e.licitacionesPorRubro.map((x) => ({ etiqueta: x.rubro, valor: x.valor }))} color="var(--violet)" />
        </Card>
      </div>
      <Card>
        <CardHeader icon="wallet" title="Últimas ventas" action={<Link to="/app/ventas" className="link">Ver todas</Link>} />
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Empresa</th><th>Plan</th><th>Monto</th><th>Método</th><th>Fecha</th><th>Estado</th></tr></thead>
            <tbody>
              {ventas.data?.slice(0, 6).map((v) => (
                <tr key={v.id}><td><b>{v.usuarioNombre}</b></td><td>{v.plan}</td><td>{clp(v.monto)}</td><td>{v.metodo}</td><td>{fechaCorta(v.fecha)}</td><td><Badge tono={tonoEstado(v.estado)} dot>{v.estado}</Badge></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
