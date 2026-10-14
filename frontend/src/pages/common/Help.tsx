import { useState } from 'react'
import { Card, PageHeader } from '../../components/ui/ui'
import { useAuth } from '../../context/AuthContext'
import { Icon } from '../../lib/icons'

const COMUN = [
  ['¿Cómo funciona LicitaWatch?', 'Los Licitadores publican sus necesidades y las Pymes postulan. El Licitador elige, adjudica y conversa con la Pyme por chat.'],
  ['¿Mis datos están protegidos?', 'Sí. Tu contraseña se guarda cifrada y solo los Licitadores y Pymes involucrados ven una postulación.'],
  ['Olvidé mi contraseña', 'En la pantalla de ingreso usa “¿Olvidaste tu contraseña?”. Te enviaremos un enlace al correo que vence en 1 hora.'],
]
const POR_ROL: Record<string, string[][]> = {
  LICITADOR: [
    ['¿Tiene costo publicar?', 'No. Para los Licitadores LicitaWatch es gratis y sin límite de licitaciones.'],
    ['¿Cómo adjudico?', 'Aprueba una postulación y presiona “Adjudicar”. Se rechazan las demás pendientes y se abre un chat con la Pyme.'],
  ],
  PYME: [
    ['¿Cuántas postulaciones tengo?', 'Estándar: 3 al mes. Premium: 7 al mes, además de prioridad en el listado y LicitAsist.'],
    ['¿Cómo pago Premium?', 'Desde “Mi suscripción”, con tarjeta de crédito o débito mediante Webpay (Transbank).'],
  ],
  ADMIN: [['¿Qué puedo hacer como administrador?', 'Ver usuarios, bloquearlos o eliminarlos, moderar licitaciones y revisar ventas y suscripciones.']],
}

export function Help() {
  const { sesion } = useAuth()
  const [abierta, setAbierta] = useState(0)
  const items = [...(POR_ROL[sesion!.usuario.rol] ?? []), ...COMUN]
  return (
    <div className="stack">
      <PageHeader title="Centro de ayuda" subtitle="Respuestas rápidas a las dudas más comunes." />
      <Card pad={false}>
        {items.map(([q, a], i) => (
          <div key={q} className={`faq ${abierta === i ? 'open' : ''}`}>
            <button onClick={() => setAbierta(abierta === i ? -1 : i)}><span>{q}</span><Icon name="chevdown" size={18} /></button>
            {abierta === i && <p>{a}</p>}
          </div>
        ))}
      </Card>
    </div>
  )
}
