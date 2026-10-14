package cl.licitawatch.notificaciones.bff;

import cl.licitawatch.common.Auth;
import cl.licitawatch.notificaciones.bs.NotificacionService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
public class NotificacionController {
    public record Nueva(long usuarioId, String tipo, String titulo, String detalle, boolean enviarCorreo) {}
    private final NotificacionService svc;
    public NotificacionController(NotificacionService svc) { this.svc = svc; }

    @GetMapping("/api/notificaciones") public List<NotificacionService.NotificacionDto> mias(HttpServletRequest r) { return svc.de(Auth.sesion(r).usuarioId()); }
    @PostMapping("/api/notificaciones/leidas") public ResponseEntity<Void> leidas(HttpServletRequest r) { Auth.sesion(r); return ResponseEntity.noContent().build(); }

    @PostMapping("/internal/notificaciones")
    public ResponseEntity<Void> crear(@RequestBody Nueva n) { svc.crear(n.usuarioId(), n.tipo(), n.titulo(), n.detalle(), n.enviarCorreo()); return ResponseEntity.accepted().build(); }
}
