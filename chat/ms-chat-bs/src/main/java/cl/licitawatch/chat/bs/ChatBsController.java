package cl.licitawatch.chat.bs;

import cl.licitawatch.chat.bs.ChatService.*;
import cl.licitawatch.common.Auth;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Capa BS de Chat. /bs/** lo llama el BFF (con la sesión en cabeceras); /internal/** lo llama la capa BS de Licitaciones. */
@RestController
public class ChatBsController {
    public record Envio(String contenido) {}
    private final ChatService svc;
    public ChatBsController(ChatService svc) { this.svc = svc; }

    @GetMapping("/bs/chat/conversaciones") public List<ConversacionDto> conversaciones(HttpServletRequest r) { return svc.de(Auth.sesion(r).usuarioId()); }
    @GetMapping("/bs/chat/conversaciones/{id}/mensajes") public List<MensajeDto> mensajes(HttpServletRequest r, @PathVariable long id) { return svc.mensajes(id, Auth.sesion(r).usuarioId()); }
    @PostMapping("/bs/chat/conversaciones/{id}/mensajes") @ResponseStatus(HttpStatus.CREATED)
    public MensajeDto enviar(HttpServletRequest r, @PathVariable long id, @RequestBody Envio b) { return svc.enviar(id, Auth.sesion(r).usuarioId(), b.contenido()); }
    @DeleteMapping("/bs/chat/conversaciones/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(HttpServletRequest r, @PathVariable long id) { svc.eliminarPara(id, Auth.sesion(r).usuarioId()); }

    @GetMapping("/internal/conversaciones/por-postulaciones") public Map<Long, Long> porPostulaciones(@RequestParam List<Long> ids) { return svc.porPostulaciones(ids); }
    @PostMapping("/internal/conversaciones") public Map<String, Long> crear(@RequestBody NuevaConversacion d) { return svc.crear(d); }
}
