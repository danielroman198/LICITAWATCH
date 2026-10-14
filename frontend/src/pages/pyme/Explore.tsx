import { useEffect, useState } from 'react'
import { api } from '../../api'
import { Button, Card, Cargando, EmptyState, Input, PageHeader, Select, useAsync } from '../../components/ui/ui'
import { TenderCard } from '../../components/app/shared'
import { useCatalogos } from '../../context/AuthContext'
import { Icon } from '../../lib/icons'

export function Explore() {
  const cat = useCatalogos()
  const [q, setQ] = useState('')
  const [qDeb, setQDeb] = useState('')
  const [rubroId, setRubroId] = useState(0)
  const [regionId, setRegionId] = useState(0)
  const [presu, setPresu] = useState(0)
  useEffect(() => { const t = setTimeout(() => setQDeb(q), 300); return () => clearTimeout(t) }, [q])
  const { data, loading } = useAsync(
    () => api.licitaciones({ estado: 'Abierta', q: qDeb || undefined, rubroId: rubroId || undefined, regionId: regionId || undefined, presupuestoMax: presu || undefined }),
    [qDeb, rubroId, regionId, presu],
  )
  const limpiar = () => { setQ(''); setRubroId(0); setRegionId(0); setPresu(0) }
  const hay = q || rubroId || regionId || presu
  return (
    <div className="stack">
      <PageHeader title="Explorar licitaciones" subtitle="La búsqueda es ilimitada en todos los planes. Postula a las que más te acomoden." />
      <Card className="filters">
        <div className="filters-row">
          <Input icon="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca por título, empresa o descripción…" className="grow" />
          <Select value={rubroId} onChange={(e) => setRubroId(Number(e.target.value))}><option value={0}>Todos los rubros</option>{cat.rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select>
          <Select value={regionId} onChange={(e) => setRegionId(Number(e.target.value))}><option value={0}>Todas las regiones</option>{cat.regiones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select>
          <Select value={presu} onChange={(e) => setPresu(Number(e.target.value))}>
            <option value={0}>Cualquier presupuesto</option>
            <option value={5000000}>Hasta $5M</option>
            <option value={20000000}>Hasta $20M</option>
            <option value={60000000}>Hasta $60M</option>
          </Select>
          {hay ? <Button variant="ghost" icon="x" onClick={limpiar}>Limpiar</Button> : null}
        </div>
      </Card>
      <div className="results-line"><Icon name="filter" size={16} />{loading ? 'Buscando…' : `${data?.length ?? 0} licitación${data?.length === 1 ? '' : 'es'} abierta${data?.length === 1 ? '' : 's'}`}</div>
      {loading ? <Cargando /> : !data || data.length === 0
        ? <Card><EmptyState icon="search" titulo="Sin resultados" texto="Prueba con otros filtros o palabras clave." accion={<Button variant="soft" onClick={limpiar}>Limpiar filtros</Button>} /></Card>
        : <div className="tgrid tgrid-3">{data.map((l) => <TenderCard key={l.id} l={l} />)}</div>}
    </div>
  )
}
