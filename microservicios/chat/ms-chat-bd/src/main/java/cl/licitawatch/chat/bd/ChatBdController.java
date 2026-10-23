package cl.licitawatch.chat.bd;

import cl.licitawatch.chat.bd.Repos.*;
import cl.licitawatch.common.ApiException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Capa BD de Chat: acceso a las tablas conversacion y mensaje. Solo la llama la capa BS (X-Internal-Key). */
@RestController
@RequestMapping("/bd")
public class ChatBdController {
    public record ConvFila(Long id, Long postulacionId, Long licitadorId, Long pymeId, Instant createdAt, Instant borradaLicitadorAt, Instant borradaPymeAt) {}
    public record MsgFila(Long id, Long conversacionId, Long emisorId, String contenido, Instant enviadoAt, boolean leido) {}
    public record NuevaConv(Long postulacionId, Long licitadorId, Long pymeId) {}
    public record NuevoMsg(Long conversacionId, Long emisorId, String contenido) {}
    public record Borrado(long usuarioId, Instant cuando) {}
    public record Lectura(long lectorId, Instant desde) {}

    private final ConversacionRepo convs; private final MensajeRepo msgs;
    public ChatBdController(ConversacionRepo convs, MensajeRepo msgs) { this.convs = convs; this.msgs = msgs; }

    private static ConvFila fila(Conversacion c) { return new ConvFila(c.getId(), c.getPostulacionId(), c.getLicitadorId(), c.getPymeId(), c.getCreatedAt(), c.getBorradaLicitadorAt(), c.getBorradaPymeAt()); }
    private static MsgFila fila(Mensaje m) { return new MsgFila(m.getId(), m.getConversacionId(), m.getEmisorId(), m.getContenido(), m.getEnviadoAt(), m.isLeido()); }
    private Conversacion conv(long id) { return convs.findById(id).orElseThrow(() -> ApiException.noEncontrado("Conversación no encontrada")); }

    // ---------- conversacion ----------
    /** Idempotente: postulacion_id es único, así que si ya existe se devuelve la misma. */
    @PostMapping("/conversaciones") @Transactional
    public ConvFila crear(@RequestBody NuevaConv d) {
        return fila(convs.findByPostulacionId(d.postulacionId()).orElseGet(() -> {
            Conversacion n = new Conversacion();
            n.setPostulacionId(d.postulacionId()); n.setLicitadorId(d.licitadorId()); n.setPymeId(d.pymeId());
            return convs.save(n);
        }));
    }

    @GetMapping("/conversaciones/{id}") public ConvFila obtener(@PathVariable long id) { return fila(conv(id)); }
    @GetMapping("/conversaciones") public List<ConvFila> deUsuario(@RequestParam long usuarioId) { return convs.findByLicitadorIdOrPymeId(usuarioId, usuarioId).stream().map(ChatBdController::fila).toList(); }
    @GetMapping("/conversaciones/por-postulaciones") public List<ConvFila> porPostulaciones(@RequestParam List<Long> ids) { return convs.findByPostulacionIdIn(ids).stream().map(ChatBdController::fila).toList(); }

    /** Marca la conversación como eliminada solo para ese participante (borrada_licitador_at o borrada_pyme_at). */
    @PutMapping("/conversaciones/{id}/borrada") @Transactional
    public ConvFila borrar(@PathVariable long id, @RequestBody Borrado b) { Conversacion c = conv(id); c.borrarPara(b.usuarioId(), b.cuando()); return fila(c); }

    // ---------- mensaje ----------
    /** Último mensaje posterior a "desde" y cuántos de la otra persona siguen sin leer. */
    @GetMapping("/conversaciones/{id}/resumen")
    public Map<String, Object> resumen(@PathVariable long id, @RequestParam long usuarioId, @RequestParam Instant desde) {
        Map<String, Object> m = new HashMap<>();
        m.put("ultimo", msgs.findFirstByConversacionIdOrderByEnviadoAtDesc(id).filter(x -> x.getEnviadoAt().isAfter(desde)).map(ChatBdController::fila).orElse(null));
        m.put("noLeidos", msgs.countByConversacionIdAndEmisorIdNotAndLeidoFalseAndEnviadoAtAfter(id, usuarioId, desde));
        return m;
    }

    /** Mensajes posteriores a "desde"; los de la otra persona quedan marcados como leídos (una sola transacción). */
    @PostMapping("/conversaciones/{id}/lectura") @Transactional
    public List<MsgFila> leer(@PathVariable long id, @RequestBody Lectura l) {
        List<Mensaje> lista = msgs.findByConversacionIdAndEnviadoAtAfterOrderByEnviadoAtAsc(id, l.desde());
        lista.stream().filter(m -> !m.getEmisorId().equals(l.lectorId()) && !m.isLeido()).forEach(m -> m.setLeido(true));
        return lista.stream().map(ChatBdController::fila).toList();
    }

    @PostMapping("/mensajes") @Transactional
    public MsgFila enviar(@RequestBody NuevoMsg d) { return fila(msgs.save(new Mensaje(d.conversacionId(), d.emisorId(), d.contenido()))); }
}
