package cl.licitawatch.ventas.bs;

import cl.licitawatch.common.Auth;
import cl.licitawatch.ventas.bs.VentasService.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Capa BS de Ventas. /bs/** lo llama el BFF (con la sesión en cabeceras); /internal/** lo llaman las capas BS de otros dominios. */
@RestController
public class VentasBsController {
    public record Pago(long planId, String metodo, boolean simularRechazo) {}
    private final VentasService ventas;
    public VentasBsController(VentasService ventas) { this.ventas = ventas; }

    @GetMapping("/bs/ventas/planes") public List<PlanDto> planes() { return ventas.planes(); }
    @GetMapping("/bs/ventas/suscripcion") public SuscripcionDto suscripcion(HttpServletRequest r) { return ventas.miSuscripcion(Auth.sesion(r).usuarioId()); }
    @GetMapping("/bs/ventas/pagos/mios") public List<VentaDto> pagos(HttpServletRequest r) { return ventas.misPagos(Auth.sesion(r).usuarioId()); }
    @PostMapping("/bs/ventas/pagos") public ResultadoPago pagar(HttpServletRequest r, @RequestBody Pago b) { return ventas.pagar(Auth.sesion(r).usuarioId(), b.planId(), b.metodo(), b.simularRechazo()); }
    @PostMapping("/bs/ventas/suscripcion/cancelar") public SuscripcionDto cancelar(HttpServletRequest r) { return ventas.cancelar(Auth.sesion(r).usuarioId()); }
    @GetMapping("/bs/ventas/todas") public List<VentaDto> todas() { return ventas.todas(); }

    // ---- servicio a servicio ----
    @GetMapping("/internal/ventas/planes") public Map<String, String> planesActivos() { return ventas.planesActivos(); }
    @GetMapping("/internal/ventas/resumen") public Map<String, Object> resumen() { return ventas.resumen(); }
    @GetMapping("/internal/suscripciones/{usuarioId}") public SuscripcionDto interna(@PathVariable long usuarioId) { return ventas.miSuscripcion(usuarioId); }
    @PostMapping("/internal/usuarios/{id}/eliminar") public void eliminar(@PathVariable long id) { ventas.eliminarUsuario(id); }
}
