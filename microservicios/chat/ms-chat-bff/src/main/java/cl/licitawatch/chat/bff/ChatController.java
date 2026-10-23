package cl.licitawatch.chat.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** BFF de Chat: solo Licitador y Pyme; valida la sesión y el rol y delega en la capa BS. */
@RestController
public class ChatController {
    public record Envio(String contenido) {}
    private final InternalClient bs; private final String urlBs;
    public ChatController(InternalClient bs, @Value("${lw.urls.bs}") String urlBs) { this.bs = bs; this.urlBs = urlBs; }

    private void participante(HttpServletRequest r) { Auth.exigir(r, "LICITADOR", "PYME"); }

    @GetMapping("/api/chat/conversaciones") public JsonNode conversaciones(HttpServletRequest r) { participante(r); return bs.get(urlBs + "/bs/chat/conversaciones", JsonNode.class); }
    @GetMapping("/api/chat/conversaciones/{id}/mensajes") public JsonNode mensajes(HttpServletRequest r, @PathVariable long id) { participante(r); return bs.get(urlBs + "/bs/chat/conversaciones/" + id + "/mensajes", JsonNode.class); }
    @PostMapping("/api/chat/conversaciones/{id}/mensajes") @ResponseStatus(HttpStatus.CREATED)
    public JsonNode enviar(HttpServletRequest r, @PathVariable long id, @RequestBody Envio b) { participante(r); return bs.post(urlBs + "/bs/chat/conversaciones/" + id + "/mensajes", b, JsonNode.class); }
    @DeleteMapping("/api/chat/conversaciones/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(HttpServletRequest r, @PathVariable long id) { participante(r); bs.reenviar(HttpMethod.DELETE, urlBs + "/bs/chat/conversaciones/" + id, null); }
}
