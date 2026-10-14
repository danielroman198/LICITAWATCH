import { Link } from '../../lib/router'
import { PublicPage } from '../../components/layout/PublicLayout'
import { HeroFallback, MediaVideo } from '../../components/layout/MediaVideo'
import { Icon, type IconName } from '../../lib/icons'
import { Badge, Cargando, useAsync } from '../../components/ui/ui'
import { api } from '../../api'
import { clp } from '../../lib/format'

const PASOS: { icon: IconName; t: string; d: string }[] = [
  { icon: 'file', t: '1 · Publica', d: 'El Licitador publica su necesidad con presupuesto, fecha de cierre y documentos. Sin costo.' },
  { icon: 'search', t: '2 · Encuentra', d: 'Las Pymes buscan y filtran por rubro, región y presupuesto. La búsqueda es ilimitada.' },
  { icon: 'send', t: '3 · Postula', d: 'La Pyme envía su propuesta. El Licitador la aprueba o rechaza con un clic.' },
  { icon: 'handshake', t: '4 · Adjudica y conversa', d: 'Al adjudicar, se abre automáticamente un chat privado entre ambas partes.' },
]

export function Home() {
  const planes = useAsync(() => api.planes(), [])
  return (
    <PublicPage>
      {/* HERO */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><i /> Plataforma privada de licitaciones B2B · Chile</span>
            <h1>
              Licita, postula y cierra negocios <em>en un solo lugar</em>.
            </h1>
            <p className="lead">
              LicitaWatch conecta a empresas que necesitan un servicio con Pymes que pueden cumplirlo. Publicar es <b>gratis para el Licitador</b>; las Pymes
              eligen el plan que mejor se ajusta a su crecimiento.
            </p>
            <div className="hero-cta">
              <Link to="/registro/licitador" className="btn btn-primary btn-lg"><Icon name="building" size={20} /><span>Registrarme como Licitador</span></Link>
              <Link to="/registro/pyme" className="btn btn-teal btn-lg"><Icon name="briefcase" size={20} /><span>Registrarme como Pyme</span></Link>
            </div>
            <div className="hero-ticks">
              <span><Icon name="check" size={16} /> Licitadores: 100% gratis</span>
              <span><Icon name="check" size={16} /> Pymes: plan Estándar sin costo</span>
              <span><Icon name="check" size={16} /> Sin tarjeta para comenzar</span>
            </div>
          </div>
          <div className="hero-media">
            <div className="hero-video">
              <MediaVideo src="/media/hero.mp4" fallback={<HeroFallback />} />
            </div>
          </div>
        </div>
        <div className="wrap">
          <div className="strip">
            {[
              ['shieldcheck', 'Empresas validadas con el SII'],
              ['chat', 'Chat privado al adjudicar'],
              ['bell', 'Alertas por correo'],
              ['card', 'Pagos con Transbank'],
              ['sparkles', 'Asistente con IA'],
            ].map(([i, t]) => (
              <div key={t}><Icon name={i as IconName} size={18} /><span>{t}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="sec" id="como-funciona">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Cómo funciona</span>
            <h2>Del anuncio al acuerdo, sin planillas ni correos perdidos</h2>
            <p>LicitaWatch ordena todo el camino de una licitación privada para que ambas partes avancen rápido y con trazabilidad.</p>
          </div>
          <div className="steps">
            {PASOS.map((p) => (
              <div className="step" key={p.t}>
                <span className="step-ic"><Icon name={p.icon} size={24} /></span>
                <h4>{p.t}</h4>
                <p>{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOS ENTRADAS */}
      <section className="sec sec-soft">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Elige tu camino</span>
            <h2>Una plataforma, dos formas de crecer</h2>
          </div>
          <div className="roles">
            <article className="role role-lic" id="licitadores">
              <div className="role-top">
                <span className="role-ic"><Icon name="building" size={28} /></span>
                <Badge tono="blue" icon="check">Siempre gratis</Badge>
              </div>
              <h3>Soy Licitador</h3>
              <p className="role-lead">Tengo una necesidad y quiero recibir las mejores propuestas.</p>
              <ul className="ticks">
                <li><Icon name="checkcircle" size={18} /> Publica licitaciones con presupuesto, documentos e imagen</li>
                <li><Icon name="checkcircle" size={18} /> Recibe postulaciones de Pymes verificadas</li>
                <li><Icon name="checkcircle" size={18} /> Aprueba, rechaza y adjudica con un clic</li>
                <li><Icon name="checkcircle" size={18} /> Chat privado automático con la Pyme adjudicada</li>
                <li><Icon name="checkcircle" size={18} /> Panel con métricas de tus licitaciones</li>
              </ul>
              <div className="role-price"><b>$0</b><span>para siempre, sin límite de publicaciones</span></div>
              <Link to="/registro/licitador" className="btn btn-primary btn-lg btn-block"><span>Registrarme como Licitador</span><Icon name="arrowright" size={18} /></Link>
            </article>

            <article className="role role-pyme" id="pymes">
              <div className="role-top">
                <span className="role-ic"><Icon name="briefcase" size={28} /></span>
                <Badge tono="teal" icon="sparkles">Plan Estándar gratis</Badge>
              </div>
              <h3>Soy Pyme</h3>
              <p className="role-lead">Quiero encontrar clientes y ganar nuevas licitaciones.</p>
              <ul className="ticks">
                <li><Icon name="checkcircle" size={18} /> Búsqueda ilimitada de licitaciones por rubro y región</li>
                <li><Icon name="checkcircle" size={18} /> Postula y haz seguimiento del estado de cada propuesta</li>
                <li><Icon name="checkcircle" size={18} /> Chat directo con el Licitador al ser adjudicada</li>
                <li><Icon name="checkcircle" size={18} /> Pasa a Premium: más postulaciones, IA y mayor visibilidad</li>
                <li><Icon name="checkcircle" size={18} /> Alertas por correo de licitaciones de tu rubro</li>
              </ul>
              <div className="role-price"><b>Desde $0</b><span>Estándar gratis · Premium {clp(24990)}/mes</span></div>
              <Link to="/registro/pyme" className="btn btn-teal btn-lg btn-block"><span>Registrarme como Pyme</span><Icon name="arrowright" size={18} /></Link>
            </article>
          </div>
        </div>
      </section>

      {/* MODELO / PLANES */}
      <section className="sec" id="planes">
        <div className="wrap">
          <div className="sec-head">
            <span className="kicker">Modelo de negocio transparente</span>
            <h2>Gratis para quienes publican. Suscripción para quienes postulan.</h2>
            <p>Los Licitadores atraen las oportunidades, por eso su uso es gratuito. Las Pymes —más numerosas— eligen entre dos planes.</p>
          </div>
          {planes.loading ? <Cargando /> : (
            <div className="plans">
              {planes.data?.map((p) => (
                <div key={p.id} className={`plan ${p.nombre === 'Premium' ? 'plan-pro' : ''}`}>
                  {p.nombre === 'Premium' && <span className="plan-flag"><Icon name="crown" size={14} /> Más elegido</span>}
                  <h3>{p.nombre}</h3>
                  <p className="plan-desc">{p.descripcion}</p>
                  <div className="plan-price"><b>{p.precioMensual === 0 ? '$0' : clp(p.precioMensual)}</b><span>{p.precioMensual === 0 ? 'para siempre' : 'al mes'}</span></div>
                  <ul>
                    {p.beneficios.map((b) => <li key={b}><Icon name="check" size={16} />{b}</li>)}
                  </ul>
                  <Link to="/registro/pyme" className={`btn btn-block btn-lg ${p.nombre === 'Premium' ? 'btn-teal' : 'btn-outline'}`}><span>{p.nombre === 'Premium' ? 'Quiero Premium' : 'Empezar gratis'}</span></Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* LICITASIST */}
      <section className="sec sec-soft" id="asistente">
        <div className="wrap ai-grid">
          <div>
            <span className="kicker">Inteligencia artificial</span>
            <h2>LicitAsist: tu asistente para encontrar la licitación correcta</h2>
            <p className="lead2">Pregúntale en lenguaje natural y te muestra las oportunidades abiertas que mejor se ajustan a tu rubro, región y plazos. Incluido en el plan Premium.</p>
            <ul className="ticks">
              <li><Icon name="checkcircle" size={18} /> “Muéstrame licitaciones de tecnología que cierren pronto”</li>
              <li><Icon name="checkcircle" size={18} /> “¿Cuántas postulaciones me quedan este mes?”</li>
              <li><Icon name="checkcircle" size={18} /> “¿Cómo postulo a una licitación?”</li>
            </ul>
          </div>
          <div className="ai-card">
            <div className="ai-msg me">Busca licitaciones de Tecnología en Valparaíso</div>
            <div className="ai-msg bot"><Icon name="sparkles" size={16} /> Encontré 1 licitación abierta en Tecnología. Esta es la más relevante:</div>
            <div className="ai-result">
              <b>Desarrollo de portal web y app móvil</b>
              <span>Retail Pacífico · Valparaíso</span>
              <em>$12M – $20M · cierra en 18 días</em>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="sec">
        <div className="wrap">
          <div className="cta">
            <div>
              <h2>Empieza hoy, en menos de 3 minutos</h2>
              <p>Valida tu empresa con el SII, completa tu perfil y entra a tu panel.</p>
            </div>
            <div className="cta-btns">
              <Link to="/registro/licitador" className="btn btn-white btn-lg"><span>Soy Licitador</span></Link>
              <Link to="/registro/pyme" className="btn btn-outline-white btn-lg"><span>Soy Pyme</span></Link>
            </div>
          </div>
        </div>
      </section>
    </PublicPage>
  )
}
