package cl.licitawatch.asistente.bs;

import cl.licitawatch.asistente.bs.AsistenteService.Respuesta;
import cl.licitawatch.common.Auth;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

/** Capa BS de LicitAsist: la llama el BFF con la sesión en cabeceras. */
@RestController
public class AsistenteBsController {
    public record Pregunta(String texto) {}
    private final AsistenteService svc;
    public AsistenteBsController(AsistenteService svc) { this.svc = svc; }

    @PostMapping("/bs/asistente/preguntar")
    public Respuesta preguntar(HttpServletRequest r, @RequestBody Pregunta b) { return svc.preguntar(Auth.sesion(r).usuarioId(), b.texto()); }
}
