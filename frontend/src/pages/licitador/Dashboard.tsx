import { api } from '../../api'
import { AreaChart, Donut } from '../../lib/charts'
import { Badge, Button, Card, CardHeader, Cargando, EmptyState, PageHeader, StatCard, tonoEstado, useAsync } from '../../components/ui/ui'
import { BannerCarousel, NotifPanel, TenderCard } from '../../components/app/shared'
import { Link, navigate } from '../../lib/router'
import { Icon } from '../../lib/icons'

export function LicitadorDashboard() {
  const { data: r, loading } = useAsync(() => api.resumenLicitador(), [])
  if (loading || !r) return <Cargando />
  return (
    <div className="stack">
      <BannerCarousel slides={[
        { chip: 'Siempre gratis', icon: 'gift', tono: 'blue', titulo: 'Publica y adjudica sin pagar nada', texto: 'Como Licitador, todas las funcionalidades son gratuitas: publicaciones ilimitadas, postulaciones y chat.', to: '/app/licitaciones/nueva', cta: 'Publicar licitación' },
        { chip: 'Postulaciones', icon: 'users', tono: 'teal', titulo: 'Revisa y selecciona a la mejor Pyme', texto: 'Aprueba o rechaza cada propuesta y adjudica con un clic. Las Premium aparecen primero.', to: '/app/licitaciones', cta: 'Ver mis licitaciones' },
        { chip: 'Chat privado', icon: 'chat', tono: 'violet', titulo: 'Conversa con la Pyme adjudicada', texto: 'Cuando adjudicas, el chat se abre automáticamente para coordinar los siguientes pasos.', to: '/app/chat', cta: 'Abrir chat' },
      ]} />
      <PageHeader title="Panel de control" subtitle="Resumen de tus licitaciones y postulaciones recibidas." actions={<Button icon="plus" onClick={() => navigate('/app/licitaciones/nueva')}>Publicar licitación</Button>} />
      <div className="grid-main">
        <div className="stack">
          <div className="stats">
            <StatCard icon="file" label="Licitaciones publicadas" valor={r.publicadas} />
            <StatCard icon="clock" label="Abiertas" valor={r.abiertas} tono="green" />
            <StatCard icon="users" label="Postulaciones recibidas" valor={r.postulacionesRecibidas} tono="violet" />
            <StatCard icon="award" label="Adjudicadas" valor={r.adjudicadas} tono="amber" />
          </div>
          <div className="grid-2-eq">
            <Card>
              <CardHeader icon="trending" title="Postulaciones por mes" subtitle="Últimos 6 meses" />
              <AreaChart datos={r.porMes} />
            </Card>
            <Card>
              <CardHeader icon="chart" title="Estado de tus licitaciones" />
              <Donut centro={String(r.publicadas)} subtitulo="licitaciones" segmentos={[
                { etiqueta: 'Abiertas', valor: r.abiertas, color: 'var(--green)' },
                { etiqueta: 'Adjudicadas', valor: r.adjudicadas, color: 'var(--violet)' },
                { etiqueta: 'Cerradas', valor: Math.max(0, r.publicadas - r.abiertas - r.adjudicadas), color: '#C3CCDD' },
              ]} />
              {r.pendientes > 0 && (
                <Link to="/app/licitaciones" className="callout">
                  <Icon name="alert" size={18} /><span><b>{r.pendientes} postulación{r.pendientes === 1 ? '' : 'es'}</b> esperando tu revisión</span><Icon name="arrowright" size={16} />
                </Link>
              )}
            </Card>
          </div>
          <Card>
            <CardHeader icon="file" title="Tus licitaciones recientes" action={<Link to="/app/licitaciones" className="link">Ver todas</Link>} />
            {r.recientes.length === 0 ? <EmptyState icon="file" titulo="Aún no publicas licitaciones" texto="Publica tu primera necesidad y recibe propuestas." accion={<Button icon="plus" onClick={() => navigate('/app/licitaciones/nueva')}>Publicar licitación</Button>} /> : (
              <div className="tgrid">{r.recientes.map((l) => <TenderCard key={l.id} l={l} />)}</div>
            )}
          </Card>
        </div>
        <div className="stack">
          <NotifPanel />
          <Card className="tip-card">
            <Badge tono="blue" icon="sparkles">Consejo</Badge>
            <h4>Describe bien tu necesidad</h4>
            <p>Las licitaciones con presupuesto, plazos y bases adjuntas reciben hasta 3 veces más postulaciones de calidad.</p>
            <Link to="/app/licitaciones/nueva" className="link">Publicar ahora →</Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
export { tonoEstado }
