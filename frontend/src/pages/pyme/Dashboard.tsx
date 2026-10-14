import { api } from '../../api'
import { AreaChart, Donut } from '../../lib/charts'
import { Badge, Button, Card, CardHeader, Cargando, EmptyState, PageHeader, Progress, StatCard, useAsync } from '../../components/ui/ui'
import { BannerCarousel, NotifPanel, TenderCard } from '../../components/app/shared'
import { Link, navigate } from '../../lib/router'
import { Icon } from '../../lib/icons'

export function PymeDashboard() {
  const { data: r, loading } = useAsync(() => api.resumenPyme(), [])
  if (loading || !r) return <Cargando />
  const restantes = Math.max(0, r.limiteMes - r.usadasMes)
  return (
    <div className="stack">
      <BannerCarousel slides={[
        { chip: 'Búsqueda de licitaciones', icon: 'search', tono: 'teal', titulo: 'Encuentra oportunidades para tu empresa', texto: 'Búsqueda ilimitada por rubro, región y presupuesto, en todos los planes.', to: '/app/explorar', cta: 'Explorar licitaciones' },
        { chip: 'LicitAsist · Premium', icon: 'sparkles', tono: 'violet', titulo: 'Pregúntale a tu asistente con IA', texto: 'Describe lo que buscas y LicitAsist te muestra las licitaciones abiertas más relevantes.', to: '/app/asistente', cta: 'Conocer LicitAsist' },
        { chip: 'Adjudicación', icon: 'chat', tono: 'blue', titulo: 'Gana una licitación y conversa al instante', texto: 'Cuando te adjudican, se abre un chat directo con el Licitador para coordinar.', to: '/app/postulaciones', cta: 'Ver mis postulaciones' },
      ]} />
      <PageHeader title="Panel de control" subtitle="Tu actividad de postulaciones y oportunidades recomendadas." actions={<Button icon="search" onClick={() => navigate('/app/explorar')}>Explorar licitaciones</Button>} />
      <div className="grid-main">
        <div className="stack">
          <div className="stats">
            <StatCard icon="send" label="Postulaciones totales" valor={r.postulacionesTotal} />
            <StatCard icon="clock" label="Pendientes" valor={r.pendientes} tono="amber" />
            <StatCard icon="checkcircle" label="Aprobadas" valor={r.aprobadas} tono="green" />
            <StatCard icon="award" label="Adjudicadas" valor={r.adjudicadas} tono="violet" />
          </div>
          <div className="grid-2-eq">
            <Card className="plan-usage">
              <CardHeader icon="crown" title="Tu plan este mes" action={<Badge tono={r.plan === 'Premium' ? 'teal' : 'gray'} icon={r.plan === 'Premium' ? 'crown' : undefined}>{r.plan}</Badge>} />
              <div className="usage-num"><b>{r.usadasMes}</b><span>de {r.limiteMes} postulaciones usadas</span></div>
              <Progress valor={r.usadasMes} max={r.limiteMes} tono={restantes === 0 ? 'red' : restantes === 1 ? 'amber' : 'accent'} />
              <p className="muted-p">{restantes === 0 ? 'Alcanzaste el límite del mes.' : `Te quedan ${restantes} postulación${restantes === 1 ? '' : 'es'} este mes.`}</p>
              {r.plan === 'Estándar' && (
                <Link to="/app/suscripcion" className="callout callout-teal"><Icon name="crown" size={18} /><span><b>Pasa a Premium</b> y postula hasta 7 veces al mes</span><Icon name="arrowright" size={16} /></Link>
              )}
            </Card>
            <Card>
              <CardHeader icon="chart" title="Resultado de tus postulaciones" />
              <Donut centro={String(r.postulacionesTotal)} subtitulo="postulaciones" segmentos={[
                { etiqueta: 'Aprobadas', valor: r.aprobadas, color: 'var(--green)' },
                { etiqueta: 'Pendientes', valor: r.pendientes, color: 'var(--amber)' },
                { etiqueta: 'Rechazadas', valor: r.rechazadas, color: '#E5484D' },
              ]} />
            </Card>
          </div>
          <Card>
            <CardHeader icon="trending" title="Postulaciones por mes" subtitle="Últimos 6 meses" />
            <AreaChart datos={r.porMes} />
          </Card>
          <Card>
            <CardHeader icon="sparkles" title="Recomendadas para ti" subtitle="Abiertas, priorizadas por tu rubro" action={<Link to="/app/explorar" className="link">Ver todas</Link>} />
            {r.recomendadas.length === 0 ? <EmptyState icon="search" titulo="No hay licitaciones nuevas por ahora" /> : <div className="tgrid">{r.recomendadas.map((l) => <TenderCard key={l.id} l={l} />)}</div>}
          </Card>
        </div>
        <div className="stack">
          <NotifPanel />
          <Card className="tip-card tip-teal">
            <Badge tono="teal" icon="sparkles">Consejo</Badge>
            <h4>Postula con un mensaje a la medida</h4>
            <p>Menciona experiencia similar y tu disponibilidad. Los Licitadores aprueban más rápido las propuestas claras.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
