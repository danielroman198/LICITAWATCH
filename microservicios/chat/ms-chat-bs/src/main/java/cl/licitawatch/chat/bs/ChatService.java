package cl.licitawatch.chat.bs;

import cl.licitawatch.common.ApiException;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/** Reglas del chat. Los datos los entrega la capa BD (ms-chat-bd); los de otros dominios, la capa BS de cada uno por /internal/**. */
@Service
public class ChatService {
    /** interlocutor = razón social de la otra empresa; se agregan su RUT, rubro (id del catálogo) y la persona de contacto (con quién se chatea). */
    public record ConversacionDto(Long id, Long postulacionId, Long licitacionId, String licitacionTitulo, Long licitadorId, Long pymeId, String interlocutor,
                                  String interlocutorRut, Integer interlocutorRubroId, String interlocutorContacto, String ultimoMensaje, Instant ultimoAt, long noLeidos) {}
    public record MensajeDto(Long id, Long conversacionId, Long emisorId, String contenido, Instant enviadoAt, boolean leido) {}
    public record NuevaConversacion(Long postulacionId, Long licitadorId, Long pymeId) {}
    /** Fila de la tabla conversacion tal como la entrega la capa BD. */
    record Conv(Long id, Long postulacionId, Long licitadorId, Long pymeId, Instant createdAt, Instant borradaLicitadorAt, Instant borradaPymeAt) {
        /** Desde cuándo ve esta persona la conversación (lo eliminado antes queda oculto solo para ella). */
        Instant corte(long usuarioId) {
            Instant b = licitadorId.equals(usuarioId) ? borradaLicitadorAt : borradaPymeAt;
            return b == null ? Instant.EPOCH : b;
        }
    }
    private record Contraparte(String nombre, String rut, Integer rubroId, String contacto) {}
    private record Habilitada(Long licitacionId, String titulo) {}

    private final InternalClient interno; private final String urlBd, urlNotif, urlLicitaciones, urlUsuarios;
    public ChatService(InternalClient interno, @Value("${lw.urls.bd}") String urlBd, @Value("${lw.urls.notificaciones}") String urlNotif,
                       @Value("${lw.urls.licitaciones}") String urlLicitaciones, @Value("${lw.urls.usuarios}") String urlUsuarios) {
        this.interno = interno; this.urlBd = urlBd; this.urlNotif = urlNotif; this.urlLicitaciones = urlLicitaciones; this.urlUsuarios = urlUsuarios;
    }

    /** Apertura automática: la llama Licitaciones al aprobar (adjudicar) una postulación. Es idempotente (postulacion_id es único). */
    public Map<String, Long> crear(NuevaConversacion d) {
        return Map.of("id", interno.post(urlBd + "/bd/conversaciones", d, Conv.class).id());
    }

    /** postulacionId -> conversacionId, para que Licitaciones muestre el acceso al chat. */
    public Map<Long, Long> porPostulaciones(List<Long> ids) {
        Map<Long, Long> out = new HashMap<>();
        if (ids.isEmpty()) return out;
        for (Conv c : interno.get(urlBd + "/bd/conversaciones/por-postulaciones?ids=" + junta(ids), Conv[].class)) out.put(c.postulacionId(), c.id());
        return out;
    }

    /**
     * Título de la licitación de cada postulación con chat habilitado (datos de Licitaciones, pedidos por REST; no se copian aquí).
     * Solo vienen las postulaciones aprobadas con la licitación adjudicada. Si Licitaciones no responde, no se habilita ningún chat.
     */
    private Map<Long, Habilitada> habilitadas(List<Conv> cs) {
        Map<Long, Habilitada> out = new HashMap<>();
        if (cs.isEmpty()) return out;
        try {
            JsonNode n = interno.get(urlLicitaciones + "/internal/postulaciones/resumen?ids=" + junta(cs.stream().map(Conv::postulacionId).toList()), JsonNode.class);
            for (JsonNode x : n) if (x.path("adjudicada").asBoolean(false))
                out.put(x.path("id").asLong(), new Habilitada(x.path("licitacionId").asLong(), x.path("licitacionTitulo").asText("")));
        } catch (Exception ignorada) { }
        return out;
    }

    private Contraparte contraparte(long usuarioId) {
        try {
            JsonNode n = interno.get(urlUsuarios + "/internal/usuarios/" + usuarioId + "/resumen", JsonNode.class);
            return new Contraparte(n.path("nombre").asText("Usuario"), texto(n, "rut"), n.hasNonNull("rubroId") ? n.get("rubroId").asInt() : null, texto(n, "nombreContacto"));
        } catch (Exception e) { return new Contraparte("Usuario", null, null, null); }
    }
    private static String texto(JsonNode n, String campo) { return n.hasNonNull(campo) ? n.get(campo).asText() : null; }

    public List<ConversacionDto> de(long usuarioId) {
        List<Conv> cs = List.of(interno.get(urlBd + "/bd/conversaciones?usuarioId=" + usuarioId, Conv[].class));
        Map<Long, Habilitada> hab = habilitadas(cs);
        List<ConversacionDto> out = new ArrayList<>();
        for (Conv c : cs) {
            Habilitada h = hab.get(c.postulacionId());
            if (h == null) continue;
            Instant corte = c.corte(usuarioId);
            JsonNode r = interno.get(urlBd + "/bd/conversaciones/" + c.id() + "/resumen?usuarioId=" + usuarioId + "&desde=" + corte, JsonNode.class);
            JsonNode ult = r.path("ultimo");
            // La eliminó y no ha llegado nada después: no se muestra (la otra empresa la sigue viendo).
            if (ult.isNull() && corte.isAfter(Instant.EPOCH)) continue;
            long otro = c.licitadorId().equals(usuarioId) ? c.pymeId() : c.licitadorId();
            Contraparte o = contraparte(otro);
            out.add(new ConversacionDto(c.id(), c.postulacionId(), h.licitacionId(), h.titulo(), c.licitadorId(), c.pymeId(), o.nombre(), o.rut(), o.rubroId(), o.contacto(),
                    ult.isNull() ? null : ult.path("contenido").asText(), ult.isNull() ? null : Instant.parse(ult.path("enviadoAt").asText()), r.path("noLeidos").asLong()));
        }
        out.sort((a, b) -> b.ultimoAt() == null ? -1 : a.ultimoAt() == null ? 1 : b.ultimoAt().compareTo(a.ultimoAt()));
        return out;
    }

    private Conv participante(long convId, long usuarioId) {
        Conv c = interno.get(urlBd + "/bd/conversaciones/" + convId, Conv.class);
        if (!c.licitadorId().equals(usuarioId) && !c.pymeId().equals(usuarioId)) throw ApiException.prohibido("No participas en esta conversación");
        if (habilitadas(List.of(c)).isEmpty()) throw ApiException.prohibido("El chat se habilita cuando el Licitador adjudica la licitación");
        return c;
    }

    /** Mensajes visibles para esta persona; al leerlos, los de la otra empresa quedan como leídos. */
    public List<MensajeDto> mensajes(long convId, long usuarioId) {
        Conv c = participante(convId, usuarioId);
        return List.of(interno.post(urlBd + "/bd/conversaciones/" + convId + "/lectura", Map.of("lectorId", usuarioId, "desde", c.corte(usuarioId)), MensajeDto[].class));
    }

    /** Elimina la conversación solo para quien lo pide (la otra empresa conserva todo). */
    public void eliminarPara(long convId, long usuarioId) {
        participante(convId, usuarioId);
        interno.put(urlBd + "/bd/conversaciones/" + convId + "/borrada", Map.of("usuarioId", usuarioId, "cuando", Instant.now()), JsonNode.class);
    }

    public MensajeDto enviar(long convId, long usuarioId, String contenido) {
        Conv c = participante(convId, usuarioId);
        if (contenido == null || contenido.isBlank()) throw ApiException.invalido("El mensaje no puede estar vacío");
        if (contenido.length() > 2000) throw ApiException.invalido("El mensaje es demasiado largo (máx. 2000 caracteres)");
        MensajeDto m = interno.post(urlBd + "/bd/mensajes", Map.of("conversacionId", convId, "emisorId", usuarioId, "contenido", contenido.trim()), MensajeDto.class);
        long otro = c.licitadorId().equals(usuarioId) ? c.pymeId() : c.licitadorId();
        interno.notificar(urlNotif, otro, "Mensaje nuevo", "Mensaje nuevo", "Tienes un mensaje nuevo en una de tus conversaciones.", false);
        return m;
    }

    private static String junta(Collection<Long> ids) { return ids.stream().map(String::valueOf).collect(Collectors.joining(",")); }
}
