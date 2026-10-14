import { useState } from 'react'
import { api } from '../../api'
import type { EstadoLicitacion } from '../../api/types'
import { Badge, Button, Card, Cargando, EmptyState, Input, PageHeader, Select, tonoEstado, useAsync } from '../../components/ui/ui'
import { useCatalogos } from '../../context/AuthContext'
import { navigate } from '../../lib/router'
import { fechaCorta, rangoPresupuesto } from '../../lib/format'

export function AdminTenders() {
  const cat = useCatalogos()
  const l = useAsync(() => api.licitacionesAdmin(), [])
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState<'' | EstadoLicitacion>('')
  if (l.loading) return <Cargando />
  const filas = (l.data ?? []).filter((x) => (!estado || x.estado === estado) && (x.titulo + x.licitadorNombre).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="stack">
      <PageHeader title="Licitaciones" subtitle="Todas las licitaciones de la plataforma." />
      <Card><div className="filters">
        <Input icon="search" placeholder="Buscar por título o Licitador…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={estado} onChange={(e) => setEstado(e.target.value as '' | EstadoLicitacion)}><option value="">Todos los estados</option><option>Abierta</option><option>Cerrada</option><option>Adjudicada</option></Select>
      </div></Card>
      <Card pad={false}>
        {filas.length === 0 ? <EmptyState icon="file" titulo="Sin resultados" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Licitación</th><th>Licitador</th><th>Rubro</th><th>Presupuesto</th><th>Postulantes</th><th>Cierre</th><th>Estado</th><th /></tr></thead>
            <tbody>{filas.map((x) => (
              <tr key={x.id}>
                <td><b>{x.titulo}</b></td><td>{x.licitadorNombre}</td><td>{cat.rubro(x.rubroId)}</td><td>{rangoPresupuesto(x.presupuestoMin, x.presupuestoMax)}</td>
                <td>{x.postulantes}</td><td>{fechaCorta(x.fechaCierre)}</td><td><Badge tono={tonoEstado(x.estado)} dot>{x.estado}</Badge></td>
                <td className="row-actions"><Button size="sm" variant="soft" icon="eye" onClick={() => navigate(`/app/licitacion/${x.id}`)}>Ver</Button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
    </div>
  )
}
