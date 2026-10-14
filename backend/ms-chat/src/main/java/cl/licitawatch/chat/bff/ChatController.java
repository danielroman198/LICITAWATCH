package cl.licitawatch.chat.bff;

import cl.licitawatch.chat.bd.Mensaje;
import cl.licitawatch.chat.bs.ChatService;
import cl.licitawatch.chat.bs.ChatService.*;
import cl.licitawatch.common.Auth;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class ChatController {
    public record Envio(String contenido) {}
    private final ChatService svc;
    public ChatController(ChatService svc) { this.svc = svc; }

    @GetMapping("/api/chat/conversaciones") public List<ConversacionDto> conversaciones(HttpServletRequest r) { return svc.de(Auth.exigir(r, "LICITADOR", "PYME").usuarioId()); }
    @GetMapping("/api/chat/conversaciones/{id}/mensajes") public List<Mensaje> mensajes(HttpServletRequest r, @PathVariable long id) { return svc.mensajes(id, Auth.exigir(r, "LICITADOR", "PYME").usuarioId()); }
    @PostMapping("/api/chat/conversaciones/{id}/mensajes") @ResponseStatus(HttpStatus.CREATED)
    public Mensaje enviar(HttpServletRequest r, @PathVariable long id, @RequestBody Envio b) { return svc.enviar(id, Auth.exigir(r, "LICITADOR", "PYME").usuarioId(), b.contenido()); }

    @GetMapping("/internal/conversaciones/por-postulaciones") public Map<Long, Long> porPostulaciones(@RequestParam List<Long> ids) { return svc.porPostulaciones(ids); }
    @PostMapping("/internal/conversaciones") public Map<String, Long> crear(@RequestBody NuevaConversacion d) { return svc.crear(d); }
}
