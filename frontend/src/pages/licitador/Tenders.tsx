import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import type { DocumentoLicitacion, EstadoLicitacion } from '../../api/types'
import { Button, Card, CardHeader, Cargando, EmptyState, Field, Input, PageHeader, Select, Tabs, Textarea, useAsync, useToast } from '../../components/ui/ui'
import { TenderCard, VolverLink } from '../../components/app/shared'
import { navigate } from '../../lib/router'
import { Icon } from '../../lib/icons'
import { useAuth, useCatalogos } from '../../context/AuthContext'
import { tipoArchivo } from '../../lib/format'

export function MyTenders() {
  const { data, loading } = useAsync(() => api.misLicitaciones(), [])
  const [tab, setTab] = useState<'todas' | EstadoLicitacion>('todas')
  const lista = (data ?? []).filter((l) => tab === 'todas' || l.estado === tab)
  const cuenta = (e: EstadoLicitacion) => (data ?? []).filter((l) => l.estado === e).length
  return (
    <div className="stack">
      <PageHeader title="Mis licitaciones" subtitle="Gestiona lo que publicaste y revisa las postulaciones recibidas." actions={<Button icon="plus" onClick={() => navigate('/app/licitaciones/nueva')}>Publicar licitación</Button>} />
      <Tabs valor={tab} onChange={setTab} items={[
        { id: 'todas', label: 'Todas', count: data?.length ?? 0 },
        { id: 'Abierta', label: 'Abiertas', count: cuenta('Abierta') },
        { id: 'Adjudicada', label: 'Adjudicadas', count: cuenta('Adjudicada') },
        { id: 'Cerrada', label: 'Cerradas', count: cuenta('Cerrada') },
      ]} />
      {loading ? <Cargando /> : lista.length === 0 ? (
        <Card><EmptyState icon="file" titulo="No hay licitaciones aquí" texto="Publica una nueva licitación para empezar a recibir propuestas." accion={<Button icon="plus" onClick={() => navigate('/app/licitaciones/nueva')}>Publicar licitación</Button>} /></Card>
      ) : <div className="tgrid tgrid-3">{lista.map((l) => <TenderCard key={l.id} l={l} />)}</div>}
    </div>
  )
}

export function TenderForm() {
  const cat = useCatalogos()
  const toast = useToast()
  const { sesion } = useAuth()
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [rubroId, setRubroId] = useState(0)
  const [regionId, setRegionId] = useState(0)
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [maxPost, setMaxPost] = useState('')
  const [cierre, setCierre] = useState('')
  const [imagen, setImagen] = useState<string | undefined>()
  const [docs, setDocs] = useState<DocumentoLicitacion[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)
  const refImg = useRef<HTMLInputElement>(null)
  const refDoc = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (sesion && !rubroId) { setRubroId(sesion.perfil.rubroId); setRegionId(cat.regionDeCiudad(sesion.perfil.ciudadId) ?? 0) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion, cat.ciudades.length])

  const subirImagen = (f?: File) => {
    if (!f) return
    if (f.size > 2_000_000) { toast.error('La imagen no puede superar los 2 MB.'); return }
    const r = new FileReader()
    r.onload = () => setImagen(String(r.result))
    r.readAsDataURL(f)
  }
  const agregarDocs = (files: FileList | null) => {
    if (!files) return
    const nuevos: DocumentoLicitacion[] = Array.from(files).map((f) => ({ nombre: f.name, tipo: tipoArchivo(f.name), tamanoKb: Math.max(1, Math.round(f.size / 1024)) }))
    setDocs((d) => [...d, ...nuevos].slice(0, 6))
  }

  const publicar = async () => {
    const e: Record<string, string> = {}
    if (titulo.trim().length < 8) e.titulo = 'Describe el título (mínimo 8 caracteres)'
    if (descripcion.trim().length < 30) e.descripcion = 'Explica la necesidad con más detalle (mínimo 30 caracteres)'
    if (!rubroId) e.rubroId = 'Selecciona un rubro'
    if (!regionId) e.regionId = 'Selecciona una región'
    if (!cierre) e.cierre = 'Define la fecha de cierre'
    else if (new Date(cierre + 'T23:59:59').getTime() < Date.now()) e.cierre = 'La fecha debe ser futura'
    if (min && max && Number(min) > Number(max)) e.max = 'El máximo debe ser mayor al mínimo'
    setErrores(e)
    if (Object.keys(e).length) { toast.error('Revisa los campos marcados.'); return }
    setEnviando(true)
    try {
      const l = await api.crearLicitacion({
        titulo: titulo.trim(), descripcion: descripcion.trim(), rubroId, regionId, presupuestoMin: min ? Number(min) : undefined, presupuestoMax: max ? Number(max) : undefined,
        maxPostulantes: maxPost ? Number(maxPost) : undefined, imagenUrl: imagen, documentos: docs, fechaCierre: new Date(cierre + 'T23:59:59').toISOString(),
      })
      toast.ok('¡Licitación publicada! Ya es visible para las Pymes.')
      navigate(`/app/licitacion/${l.id}`)
    } catch (err) { toast.error((err as Error).message) } finally { setEnviando(false) }
  }

  return (
    <div className="stack narrow-page">
      <PageHeader back={<VolverLink to="/app/licitaciones" texto="Mis licitaciones" />} title="Publicar licitación" subtitle="Es gratis. Cuéntale a las Pymes qué necesitas." />
      <Card>
        <CardHeader icon="file" title="Información general" />
        <div className="form-grid">
          <Field label="Título" required error={errores.titulo} className="span-2"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej: Servicio de mantención de flota de grúas" maxLength={120} /></Field>
          <Field label="Descripción detallada" required error={errores.descripcion} hint={`${descripcion.length} caracteres`} className="span-2"><Textarea rows={5} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Alcance, requisitos, plazos, condiciones de pago…" /></Field>
          <Field label="Rubro" required error={errores.rubroId}>
            <Select value={rubroId} onChange={(e) => setRubroId(Number(e.target.value))}><option value={0}>Selecciona rubro</option>{cat.rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select>
          </Field>
          <Field label="Región de ejecución" required error={errores.regionId}>
            <Select value={regionId} onChange={(e) => setRegionId(Number(e.target.value))}><option value={0}>Selecciona región</option>{cat.regiones.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}</Select>
          </Field>
        </div>
      </Card>
      <Card>
        <CardHeader icon="dollar" title="Presupuesto y plazos" />
        <div className="form-grid">
          <Field label="Presupuesto mínimo (CLP)"><Input type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} placeholder="1000000" /></Field>
          <Field label="Presupuesto máximo (CLP)" error={errores.max}><Input type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} placeholder="3000000" /></Field>
          <Field label="Fecha de cierre" required error={errores.cierre}><Input icon="calendar" type="date" value={cierre} onChange={(e) => setCierre(e.target.value)} /></Field>
          <Field label="Máximo de postulantes" hint="Opcional. Déjalo vacío para no limitar."><Input type="number" min={1} value={maxPost} onChange={(e) => setMaxPost(e.target.value)} placeholder="10" /></Field>
        </div>
      </Card>
      <Card>
        <CardHeader icon="paperclip" title="Imagen y documentos" subtitle="Opcional · hasta 6 documentos (PDF, DOCX, XLSX)" />
        <div className="upload-row">
          <div className="upload" onClick={() => refImg.current?.click()}>
            {imagen ? <img src={imagen} alt="Imagen de la licitación" /> : <><Icon name="image" size={26} /><b>Imagen de portada</b><small>JPG o PNG, hasta 2 MB</small></>}
            <input ref={refImg} type="file" accept="image/*" hidden onChange={(e) => subirImagen(e.target.files?.[0])} />
          </div>
          <div className="upload upload-docs" onClick={() => refDoc.current?.click()}>
            <Icon name="upload" size={26} /><b>Subir documentos</b><small>Bases técnicas, anexos, planos…</small>
            <input ref={refDoc} type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" hidden onChange={(e) => { agregarDocs(e.target.files); e.target.value = '' }} />
          </div>
        </div>
        {docs.length > 0 && (
          <ul className="doc-list">
            {docs.map((d, i) => (
              <li key={d.nombre + i}>
                <span className="doc-ic"><Icon name="file" size={18} /></span>
                <div><b>{d.nombre}</b><small>{d.tipo} · {d.tamanoKb} KB</small></div>
                <button className="icon-btn" onClick={() => setDocs(docs.filter((_, k) => k !== i))} aria-label="Quitar"><Icon name="x" size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="form-actions">
        <Button variant="ghost" onClick={() => navigate('/app/licitaciones')}>Cancelar</Button>
        <Button size="lg" icon="send" loading={enviando} onClick={publicar}>Publicar licitación</Button>
      </div>
    </div>
  )
}
