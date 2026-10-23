package cl.licitawatch.ventas.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.common.InternalClient;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Positive;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;

/** BFF de Ventas: valida la sesión y el rol (suscripción y pagos: Pyme; listado de ventas: Admin) y delega en la capa BS. */
@RestController
@Validated
public class VentasController {
    private static final Logger log = LoggerFactory.getLogger(VentasController.class);
    public record Pago(@Positive long planId) {}
    private final InternalClient bs; private final String urlBs, urlFront;
    public VentasController(InternalClient bs, @Value("${lw.urls.bs}") String urlBs, @Value("${lw.frontend-url}") String urlFront) { this.bs = bs; this.urlBs = urlBs; this.urlFront = urlFront; }

    @GetMapping("/api/ventas/planes") public JsonNode planes() { return bs.get(urlBs + "/bs/ventas/planes", JsonNode.class); }
    @GetMapping("/api/ventas/suscripcion") public JsonNode suscripcion(HttpServletRequest r) { Auth.exigir(r, "PYME"); return bs.get(urlBs + "/bs/ventas/suscripcion", JsonNode.class); }
    @GetMapping("/api/ventas/pagos/mios") public JsonNode pagos(HttpServletRequest r) { Auth.exigir(r, "PYME"); return bs.get(urlBs + "/bs/ventas/pagos/mios", JsonNode.class); }
    @PostMapping("/api/ventas/suscripcion/cancelar") public JsonNode cancelar(HttpServletRequest r) { Auth.exigir(r, "PYME"); return bs.post(urlBs + "/bs/ventas/suscripcion/cancelar", null, JsonNode.class); }
    @GetMapping("/api/admin/ventas") public JsonNode admin(HttpServletRequest r) { Auth.exigir(r, "ADMIN"); return bs.get(urlBs + "/bs/ventas/todas", JsonNode.class); }

    /** Webpay Plus, paso 1: crea la transacción y devuelve { token, url } para que el navegador vaya al formulario de pago de Transbank. */
    @PostMapping("/api/ventas/webpay")
    public JsonNode iniciarWebpay(HttpServletRequest r, @RequestBody Pago b) { Auth.exigir(r, "PYME"); return bs.post(urlBs + "/bs/ventas/webpay", b, JsonNode.class); }

    /**
     * Webpay Plus, retorno (ruta pública: el navegador llega desde Transbank sin el JWT; Transbank usa GET o POST según el caso).
     *  - token_ws solo: pago terminado (aprobado o rechazado) → se confirma.
     *  - TBK_TOKEN: el usuario anuló el pago en el formulario. Solo TBK_ORDEN_COMPRA: se acabó el tiempo. En ambos no hay cobro.
     * Siempre termina redirigiendo a /app/suscripcion del frontend con el resultado en la URL.
     */
    @RequestMapping(value = "/api/ventas/webpay/retorno", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<Void> retornoWebpay(@RequestParam(name = "token_ws", required = false) String token, @RequestParam(name = "TBK_TOKEN", required = false) String tbkToken,
                                              @RequestParam(name = "TBK_ORDEN_COMPRA", required = false) String ordenAnulada) {
        UriComponentsBuilder destino = UriComponentsBuilder.fromHttpUrl(urlFront).path("/app/suscripcion");
        if (tbkToken != null || token == null || token.isBlank()) {
            destino.queryParam("pago", tbkToken != null ? "anulado" : "expirado");
            if (ordenAnulada != null) destino.queryParam("orden", ordenAnulada);
        } else {
            try {
                JsonNode res = bs.post(urlBs + "/bs/ventas/webpay/" + InternalClient.q(token) + "/confirmar", null, JsonNode.class);
                destino.queryParam("pago", res.path("estado").asText());
                for (String k : new String[]{"ordenCompra", "monto", "metodo", "plan", "codigoAutorizacion", "ultimos4", "cuotas"})
                    if (!res.path(k).asText("").isBlank()) destino.queryParam(k, res.path(k).asText());
            } catch (Exception e) {
                log.warn("No se pudo confirmar la transacción Webpay: {}", e.getMessage());
                destino.queryParam("pago", "error").queryParam("mensaje", e.getMessage() == null ? "No pudimos confirmar el pago con Webpay" : e.getMessage());
            }
        }
        return ResponseEntity.status(HttpStatus.SEE_OTHER).location(URI.create(destino.encode().build().toUriString())).build();
    }
}
