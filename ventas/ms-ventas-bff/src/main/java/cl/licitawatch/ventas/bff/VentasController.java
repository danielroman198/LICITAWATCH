package cl.licitawatch.ventas.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

/** BFF de Ventas: valida la sesión y el rol (suscripción y pagos: Pyme; listado de ventas: Admin) y delega en la capa BS. */
@RestController
public class VentasController {
    public record Pago(long planId, String metodo, boolean simularRechazo) {}
    private final InternalClient bs; private final String urlBs;
    public VentasController(InternalClient bs, @Value("${lw.urls.bs}") String urlBs) { this.bs = bs; this.urlBs = urlBs; }

    @GetMapping("/api/ventas/planes") public JsonNode planes() { return bs.get(urlBs + "/bs/ventas/planes", JsonNode.class); }
    @GetMapping("/api/ventas/suscripcion") public JsonNode suscripcion(HttpServletRequest r) { Auth.exigir(r, "PYME"); return bs.get(urlBs + "/bs/ventas/suscripcion", JsonNode.class); }
    @GetMapping("/api/ventas/pagos/mios") public JsonNode pagos(HttpServletRequest r) { Auth.exigir(r, "PYME"); return bs.get(urlBs + "/bs/ventas/pagos/mios", JsonNode.class); }
    @PostMapping("/api/ventas/pagos") public JsonNode pagar(HttpServletRequest r, @RequestBody Pago b) { Auth.exigir(r, "PYME"); return bs.post(urlBs + "/bs/ventas/pagos", b, JsonNode.class); }
    @PostMapping("/api/ventas/suscripcion/cancelar") public JsonNode cancelar(HttpServletRequest r) { Auth.exigir(r, "PYME"); return bs.post(urlBs + "/bs/ventas/suscripcion/cancelar", null, JsonNode.class); }
    @GetMapping("/api/admin/ventas") public JsonNode admin(HttpServletRequest r) { Auth.exigir(r, "ADMIN"); return bs.get(urlBs + "/bs/ventas/todas", JsonNode.class); }
}
