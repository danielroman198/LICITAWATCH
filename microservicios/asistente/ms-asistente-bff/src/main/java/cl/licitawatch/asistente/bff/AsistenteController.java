package cl.licitawatch.asistente.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

/** BFF de LicitAsist: solo Pymes (el plan Premium lo valida la capa BS); delega en la capa BS. */
@RestController
public class AsistenteController {
    public record Pregunta(String texto) {}
    private final InternalClient bs; private final String urlBs;
    public AsistenteController(InternalClient bs, @Value("${lw.urls.bs}") String urlBs) { this.bs = bs; this.urlBs = urlBs; }

    @PostMapping("/api/asistente/preguntar")
    public JsonNode preguntar(HttpServletRequest r, @RequestBody Pregunta b) { Auth.exigir(r, "PYME"); return bs.post(urlBs + "/bs/asistente/preguntar", b, JsonNode.class); }
}
