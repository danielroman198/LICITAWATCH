import { useEffect } from 'react'
import { Badge, Button, Card, EmptyState, PageHeader } from '../../components/ui/ui'
import { iconoNotificacion, useNotificaciones } from '../../components/layout/AppShell'
import { Icon } from '../../lib/icons'
import { fechaHora, hace } from '../../lib/format'

export function Notifications() {
  const n = useNotificaciones()
  useEffect(() => { /* se mantienen como "nuevas" hasta que el usuario las marque */ }, [])
  return (
    <div className="stack">
      <PageHeader title="Notificaciones" subtitle="Todo lo que pasa con tus licitaciones, postulaciones y pagos."
        actions={<Button variant="soft" icon="checkcircle" onClick={n.marcar} disabled={n.noLeidas === 0}>Marcar todas como leídas</Button>} />
      <Card pad={false}>
        {n.lista.length === 0 ? <EmptyState icon="bell" titulo="Sin notificaciones" texto="Cuando haya novedades las verás aquí." /> : (
          <ul className="notif-list">
            {n.lista.map((x) => (
              <li key={x.id} className={x.leida ? '' : 'new'}>
                <span className="notif-ic"><Icon name={iconoNotificacion(x.tipo)} size={20} /></span>
                <div><b>{x.titulo}</b><p>{x.detalle}</p><small title={fechaHora(x.createdAt)}>{hace(x.createdAt)}</small></div>
                {!x.leida && <Badge tono="blue">Nueva</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
