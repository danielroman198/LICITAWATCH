package cl.licitawatch.chat.bs;

import cl.licitawatch.chat.bd.*;
import cl.licitawatch.chat.bd.Repos.*;
import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class ChatService {
    /** interlocutor = razón social de la otra empresa; se agregan su RUT, rubro (id del catálogo) y la persona de contacto (con quién se chatea). */
    public record ConversacionDto(Long id, Long postulacionId, Long licitacionId, String licitacionTitulo, Long licitadorId, Long pymeId, String interlocutor,
                                  String interlocutorRut, Integer interlocutorRubroId, String interlocutorContacto, String ultimoMensaje, Instant ultimoAt, long noLeidos) {}
    private record Contraparte(String nombre, String rut, Integer rubroId, String contacto) {}
    public record NuevaConversacion(Long postulacionId, Long licitadorId, Long pymeId) {}

    private final ConversacionRepo convs; private final MensajeRepo msgs; private final InternalClient interno; private final String urlNotif, urlLicitaciones, urlUsuarios;
    public ChatService(ConversacionRepo convs, MensajeRepo msgs, InternalClient interno, @Value("${lw.urls.notificaciones}") String urlNotif,
                       @Value("${lw.urls.licitaciones}") String urlLicitaciones, @Value("${lw.urls.usuarios}") String urlUsuarios) {
        this.convs = convs; this.msgs = msgs; this.interno = interno; this.urlNotif = urlNotif; this.urlLicitaciones = urlLicitaciones; this.urlUsuarios = urlUsuarios;
    }

    /** Apertura automática: la llama API Licitaciones al aprobar (adjudicar) una postulación. Es idempotente (postulacion_id es único). */
    @Transactional
    public Map<String, Long> crear(NuevaConversacion d) {
        Conversacion c = convs.findByPostulacionId(d.postulacionId()).orElseGet(() -> {
            Conversacion n = new Conversacion();
            n.setPostulacionId(d.postulacionId()); n.setLicitadorId(d.licitadorId()); n.setPymeId(d.pymeId());
            return convs.save(n);
        });
        return Map.of("id", c.getId());
    }

    /** postulacionId -> conversacionId, para que Licitaciones muestre el acceso al chat. */
    public Map<Long, Long> porPostulaciones(List<Long> ids) {
        Map<Long, Long> out = new java.util.HashMap<>();
        convs.findByPostulacionIdIn(ids).forEach(c -> out.put(c.getPostulacionId(), c.getId()));
        return out;
    }

    /**
     * Título de la licitación de cada postulación con chat habilitado (datos de MS-Licitaciones, pedidos por REST; no se copian aquí).
     * Solo vienen las postulaciones aprobadas con la licitación adjudicada: las demás (p. ej. conversaciones creadas con el flujo
     * antiguo, que abría el chat al postular) quedan fuera. Si Licitaciones no responde, no se habilita ningún chat.
     */
    private Map<Long, String> habilitadas(List<Conversacion> cs) {
        Map<Long, String> out = new java.util.HashMap<>(); Map<Long, Long> licDe = new java.util.HashMap<>();
        if (cs.isEmpty()) return out;
        try {
            JsonNode n = interno.get(urlLicitaciones + "/internal/postulaciones/resumen?ids=" + cs.stream().map(c -> String.valueOf(c.getPostulacionId())).collect(java.util.stream.Collectors.joining(",")), JsonNode.class);
            for (JsonNode x : n) {
                if (!x.path("adjudicada").asBoolean(false)) continue;
                out.put(x.path("id").asLong(), x.path("licitacionTitulo").asText("")); licDe.put(x.path("id").asLong(), x.path("licitacionId").asLong());
            }
        } catch (Exception ignorada) { }
        lic.putAll(licDe);
        return out;
    }
    private final Map<Long, Long> lic = new java.util.concurrent.ConcurrentHashMap<>();

    private Contraparte contraparte(long usuarioId) {
        try {
            JsonNode n = interno.get(urlUsuarios + "/internal/usuarios/" + usuarioId + "/resumen", JsonNode.class);
            return new Contraparte(n.path("nombre").asText("Usuario"), texto(n, "rut"), n.hasNonNull("rubroId") ? n.get("rubroId").asInt() : null, texto(n, "nombreContacto"));
        } catch (Exception e) { return new Contraparte("Usuario", null, null, null); }
    }
    private static String texto(JsonNode n, String campo) { return n.hasNonNull(campo) ? n.get(campo).asText() : null; }

    public List<ConversacionDto> de(long usuarioId) {
        List<Conversacion> cs = convs.findByLicitadorIdOrPymeId(usuarioId, usuarioId);
        Map<Long, String> titulos = habilitadas(cs);
        return cs.stream().filter(c -> titulos.containsKey(c.getPostulacionId())).map(c -> {
            var ult = msgs.findFirstByConversacionIdOrderByEnviadoAtDesc(c.getId()).filter(m -> m.getEnviadoAt().isAfter(c.corte(usuarioId)));
            // La eliminó y no ha llegado nada después: no se muestra (la otra empresa la sigue viendo).
            if (ult.isEmpty() && c.corte(usuarioId).isAfter(Instant.EPOCH)) return null;
            long otro = c.getLicitadorId().equals(usuarioId) ? c.getPymeId() : c.getLicitadorId();
            Contraparte o = contraparte(otro);
            return new ConversacionDto(c.getId(), c.getPostulacionId(), lic.getOrDefault(c.getPostulacionId(), 0L), titulos.getOrDefault(c.getPostulacionId(), "Licitación"), c.getLicitadorId(), c.getPymeId(),
                    o.nombre(), o.rut(), o.rubroId(), o.contacto(), ult.map(Mensaje::getContenido).orElse(null), ult.map(Mensaje::getEnviadoAt).orElse(null),
                    msgs.countByConversacionIdAndEmisorIdNotAndLeidoFalseAndEnviadoAtAfter(c.getId(), usuarioId, c.corte(usuarioId)));
        }).filter(java.util.Objects::nonNull).sorted((a, b) -> b.ultimoAt() == null ? -1 : a.ultimoAt() == null ? 1 : b.ultimoAt().compareTo(a.ultimoAt())).toList();
    }

    private Conversacion participante(long convId, long usuarioId) {
        Conversacion c = convs.findById(convId).orElseThrow(() -> ApiException.noEncontrado("Conversación no encontrada"));
        if (!c.getLicitadorId().equals(usuarioId) && !c.getPymeId().equals(usuarioId)) throw ApiException.prohibido("No participas en esta conversación");
        if (habilitadas(List.of(c)).isEmpty()) throw ApiException.prohibido("El chat se habilita cuando el Licitador adjudica la licitación");
        return c;
    }

    @Transactional
    public List<Mensaje> mensajes(long convId, long usuarioId) {
        Conversacion c = participante(convId, usuarioId);
        List<Mensaje> l = msgs.findByConversacionIdAndEnviadoAtAfterOrderByEnviadoAtAsc(convId, c.corte(usuarioId));
        l.stream().filter(m -> !m.getEmisorId().equals(usuarioId) && !m.isLeido()).forEach(m -> m.setLeido(true));
        return l;
    }

    /** Elimina la conversación solo para quien lo pide (la otra empresa conserva todo). */
    @Transactional
    public void eliminarPara(long convId, long usuarioId) {
        participante(convId, usuarioId).borrarPara(usuarioId, Instant.now());
    }

    @Transactional
    public Mensaje enviar(long convId, long usuarioId, String contenido) {
        Conversacion c = participante(convId, usuarioId);
        if (contenido == null || contenido.isBlank()) throw ApiException.invalido("El mensaje no puede estar vacío");
        if (contenido.length() > 2000) throw ApiException.invalido("El mensaje es demasiado largo (máx. 2000 caracteres)");
        Mensaje m = msgs.save(new Mensaje(convId, usuarioId, contenido.trim()));
        long otro = c.getLicitadorId().equals(usuarioId) ? c.getPymeId() : c.getLicitadorId();
        interno.notificar(urlNotif, otro, "Mensaje nuevo", "Mensaje nuevo", "Tienes un mensaje nuevo en una de tus conversaciones.", false);
        return m;
    }
}
