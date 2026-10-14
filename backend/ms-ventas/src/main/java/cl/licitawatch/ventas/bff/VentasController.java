package cl.licitawatch.ventas.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.ventas.bs.VentasService;
import cl.licitawatch.ventas.bs.VentasService.*;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class VentasController {
    public record Pago(long planId, String metodo, boolean simularRechazo) {}
    private final VentasService ventas;
    public VentasController(VentasService ventas) { this.ventas = ventas; }

    @GetMapping("/api/ventas/planes") public List<PlanDto> planes() { return ventas.planes(); }
    @GetMapping("/api/ventas/suscripcion") public SuscripcionDto suscripcion(HttpServletRequest r) { return ventas.miSuscripcion(Auth.exigir(r, "PYME").usuarioId()); }
    @GetMapping("/api/ventas/pagos/mios") public List<VentaDto> pagos(HttpServletRequest r) { return ventas.misPagos(Auth.exigir(r, "PYME").usuarioId()); }
    @PostMapping("/api/ventas/pagos") public ResultadoPago pagar(HttpServletRequest r, @RequestBody Pago b) { return ventas.pagar(Auth.exigir(r, "PYME").usuarioId(), b.planId(), b.metodo(), b.simularRechazo()); }
    @PostMapping("/api/ventas/suscripcion/cancelar") public SuscripcionDto cancelar(HttpServletRequest r) { return ventas.cancelar(Auth.exigir(r, "PYME").usuarioId()); }
    @GetMapping("/api/admin/ventas") public List<VentaDto> admin(HttpServletRequest r) { Auth.exigir(r, "ADMIN"); return ventas.todas(); }

    // ---- servicio a servicio ----
    @GetMapping("/internal/ventas/planes") public Map<String, String> planesActivos() { return ventas.planesActivos(); }
    @GetMapping("/internal/ventas/resumen") public Map<String, Object> resumen() { return ventas.resumen(); }
    @GetMapping("/internal/suscripciones/{usuarioId}") public SuscripcionDto interna(@PathVariable long usuarioId) { return ventas.miSuscripcion(usuarioId); }
    @PostMapping("/internal/usuarios/{id}/eliminar") public void eliminar(@PathVariable long id) { ventas.eliminarUsuario(id); }
}
