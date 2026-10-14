import { useState } from 'react'
import { api } from '../../api'
import type { Rol, UsuarioAdmin } from '../../api/types'
import { Avatar, Badge, Button, Card, Cargando, EmptyState, Input, Modal, PageHeader, Select, useAsync, useToast } from '../../components/ui/ui'
import { formatearRut } from '../../lib/rut'
import { fechaCorta, hace } from '../../lib/format'

export function AdminUsers() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [rol, setRol] = useState<'' | Rol>('')
  const [estado, setEstado] = useState<'' | 'activos' | 'bloqueados'>('')
  const lista = useAsync(() => api.usuariosAdmin({ q: q || undefined, rol: rol || undefined, estado: estado || undefined }), [q, rol, estado])
  const [acc, setAcc] = useState<{ tipo: 'bloquear' | 'activar' | 'eliminar'; u: UsuarioAdmin } | null>(null)

  const ejecutar = async () => {
    if (!acc) return
    try {
      if (acc.tipo === 'eliminar') await api.eliminarUsuario(acc.u.usuario.id)
      else await api.cambiarEstadoUsuario(acc.u.usuario.id, acc.tipo === 'activar')
      toast.ok(acc.tipo === 'eliminar' ? 'Cuenta eliminada.' : acc.tipo === 'bloquear' ? 'Cuenta bloqueada.' : 'Cuenta reactivada.')
      lista.recargar()
    } catch (e) { toast.error((e as Error).message) }
    setAcc(null)
  }

  return (
    <div className="stack">
      <PageHeader title="Usuarios" subtitle="Licitadores y Pymes registrados. Bloquea o elimina cuentas." />
      <Card>
        <div className="filters">
          <Input icon="search" placeholder="Buscar por nombre, correo o RUT…" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={rol} onChange={(e) => setRol(e.target.value as '' | Rol)}><option value="">Todos los roles</option><option value="LICITADOR">Licitadores</option><option value="PYME">Pymes</option></Select>
          <Select value={estado} onChange={(e) => setEstado(e.target.value as '' | 'activos' | 'bloqueados')}><option value="">Todos los estados</option><option value="activos">Activos</option><option value="bloqueados">Bloqueados</option></Select>
        </div>
      </Card>
      <Card pad={false}>
        {lista.loading ? <Cargando /> : !lista.data?.length ? <EmptyState icon="users" titulo="Sin resultados" texto="Prueba con otros filtros." /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Usuario</th><th>Rol</th><th>RUT empresa</th><th>Plan</th><th>Registro</th><th>Último acceso</th><th>Estado</th><th /></tr></thead>
            <tbody>{lista.data.map((x) => (
              <tr key={x.usuario.id}>
                <td><div className="cell-user"><Avatar nombre={x.nombre} size={36} /><div><b>{x.nombre}</b><small>{x.usuario.email}</small></div></div></td>
                <td><Badge tono={x.usuario.rol === 'PYME' ? 'teal' : 'blue'}>{x.usuario.rol === 'PYME' ? 'Pyme' : 'Licitador'}</Badge></td>
                <td>{x.rutEmpresa ? formatearRut(x.rutEmpresa) : '—'}</td>
                <td>{x.plan ? <Badge tono={x.plan === 'Premium' ? 'violet' : 'gray'} icon={x.plan === 'Premium' ? 'crown' : undefined}>{x.plan}</Badge> : '—'}</td>
                <td>{fechaCorta(x.usuario.createdAt)}</td>
                <td>{x.usuario.ultimoLogin ? hace(x.usuario.ultimoLogin) : 'Nunca'}</td>
                <td><Badge tono={x.usuario.activo ? 'green' : 'red'} dot>{x.usuario.activo ? 'Activo' : 'Bloqueado'}</Badge></td>
                <td className="row-actions">
                  {x.usuario.activo ? <Button size="sm" variant="outline" icon="lock" onClick={() => setAcc({ tipo: 'bloquear', u: x })}>Bloquear</Button> : <Button size="sm" variant="soft" icon="unlock" onClick={() => setAcc({ tipo: 'activar', u: x })}>Activar</Button>}
                  <Button size="sm" variant="ghost" icon="trash" aria-label="Eliminar" onClick={() => setAcc({ tipo: 'eliminar', u: x })} />
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <Modal abierto={!!acc} onClose={() => setAcc(null)} titulo={acc?.tipo === 'eliminar' ? 'Eliminar cuenta' : acc?.tipo === 'bloquear' ? 'Bloquear cuenta' : 'Reactivar cuenta'}
        pie={<><Button variant="ghost" onClick={() => setAcc(null)}>Cancelar</Button><Button variant={acc?.tipo === 'activar' ? 'primary' : 'danger'} onClick={ejecutar}>Confirmar</Button></>}>
        {acc?.tipo === 'eliminar' && <p>Se eliminará definitivamente la cuenta de <b>{acc.u.nombre}</b> junto con sus licitaciones y postulaciones. No se puede deshacer.</p>}
        {acc?.tipo === 'bloquear' && <p><b>{acc.u.nombre}</b> no podrá iniciar sesión hasta que reactives su cuenta.</p>}
        {acc?.tipo === 'activar' && <p><b>{acc.u.nombre}</b> volverá a poder ingresar a la plataforma.</p>}
      </Modal>
    </div>
  )
}
