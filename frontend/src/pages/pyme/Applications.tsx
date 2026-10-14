import { useState } from 'react'
import { api } from '../../api'
import type { EstadoPostulacion } from '../../api/types'
import { Badge, Button, Card, Cargando, EmptyState, PageHeader, Tabs, tonoEstado, useAsync } from '../../components/ui/ui'
import { Link, navigate } from '../../lib/router'
import { Icon } from '../../lib/icons'
import { fechaCorta } from '../../lib/format'

export function MyApplications() {
  const { data, loading } = useAsync(() => api.misPostulaciones(), [])
  const [tab, setTab] = useState<'todas' | EstadoPostulacion>('todas')
  const lista = (data ?? []).filter((p) => tab === 'todas' || p.estado === tab)
  const n = (e: EstadoPostulacion) => (data ?? []).filter((p) => p.estado === e).length
  return (
    <div className="stack">
      <PageHeader title="Mis postulaciones" subtitle="Da seguimiento al estado de cada propuesta que enviaste." actions={<Button variant="soft" icon="search" onClick={() => navigate('/app/explorar')}>Explorar licitaciones</Button>} />
      <Tabs valor={tab} onChange={setTab} items={[
        { id: 'todas', label: 'Todas', count: data?.length ?? 0 },
        { id: 'Pendiente', label: 'Pendientes', count: n('Pendiente') },
        { id: 'Aprobada', label: 'Aprobadas', count: n('Aprobada') },
        { id: 'Rechazada', label: 'Rechazadas', count: n('Rechazada') },
      ]} />
      {loading ? <Cargando /> : lista.length === 0 ? (
        <Card><EmptyState icon="send" titulo="Sin postulaciones" texto="Cuando postules a una licitación, la verás aquí con su estado." accion={<Button icon="search" onClick={() => navigate('/app/explorar')}>Buscar licitaciones</Button>} /></Card>
      ) : (
        <div className="rows">
          {lista.map((p) => (
            <Card key={p.id} className="row-card">
              <div className="row-main">
                <div className="row-top">
                  <Badge tono={tonoEstado(p.estado)} dot>{p.estado}</Badge>
                  {p.adjudicada && <Badge tono="violet" icon="award">Adjudicada a ti</Badge>}
                </div>
                <Link to={`/app/licitacion/${p.licitacionId}`} className="row-title">{p.licitacionTitulo}</Link>
                <p className="row-sub"><Icon name="building" size={14} />{p.licitadorNombre} · Postulaste el {fechaCorta(p.fecha)}</p>
              </div>
              <div className="row-actions">
                {p.conversacionId && <Button icon="chat" variant="teal" size="sm" onClick={() => navigate(`/app/chat/${p.conversacionId}`)}>Abrir chat</Button>}
                <Button variant="outline" size="sm" iconRight="arrowright" onClick={() => navigate(`/app/licitacion/${p.licitacionId}`)}>Ver licitación</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
