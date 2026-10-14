package cl.licitawatch.asistente.bff;

import cl.licitawatch.asistente.bs.AsistenteService;
import cl.licitawatch.asistente.bs.AsistenteService.Respuesta;
import cl.licitawatch.common.Auth;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
public class AsistenteController {
    public record Pregunta(String texto) {}
    private final AsistenteService svc;
    public AsistenteController(AsistenteService svc) { this.svc = svc; }

    @PostMapping("/api/asistente/preguntar")
    public Respuesta preguntar(HttpServletRequest r, @RequestBody Pregunta b) { return svc.preguntar(Auth.exigir(r, "PYME").usuarioId(), b.texto()); }
}
